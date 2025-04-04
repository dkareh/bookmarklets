const std = @import("std");
const assert = std.debug.assert;
const fs = std.fs;
const ziggy = @import("ziggy");
const Map = ziggy.dynamic.Map;

pub fn main() !void {
    var arena_state = std.heap.ArenaAllocator.init(std.heap.page_allocator);
    defer arena_state.deinit();
    const arena = arena_state.allocator();

    const args = try std.process.argsAlloc(arena);
    const root_path = if (args.len > 1) args[1] else {
        std.log.err("no root path provided", .{});
        return error.NoRootPath;
    };

    // Read the bookmarklets metadata.
    const metadata = if (args.len > 2) blk: {
        const file = try fs.cwd().openFile(args[2], .{});
        defer file.close();
        var buffer = std.ArrayList(u8).init(arena);
        const max_bytes = std.math.maxInt(usize);
        try file.reader().readAllArrayList(&buffer, max_bytes);
        const code = try buffer.toOwnedSliceSentinel(0);
        break :blk try ziggy.parseLeaky(Bookmarklets, arena, code, .{});
    } else null;

    var buffered_writer = std.io.bufferedWriter(std.io.getStdOut().writer());
    try exportTree(arena, buffered_writer.writer().any(), root_path, metadata);
    try buffered_writer.flush();
}

// Any changes must be reflected in 'meta/bookmarklets.ziggy-schema'.
const Bookmarklets = struct {
    items: Map(Item),
};

const Item = union(enum) {
    Folder: Folder,
    Bookmarklet: Bookmarklet,
};

const Folder = struct {
    title: []const u8,
    items: Map(Item) = .{},

    pub fn from(maybe_item: ?Item) !?Folder {
        const item = maybe_item orelse return null;
        return switch (item) {
            .Folder => |folder| folder,
            else => error.ExpectedFolder,
        };
    }
};

const Bookmarklet = struct {
    title: []const u8,

    pub fn from(maybe_item: ?Item) !?Bookmarklet {
        const item = maybe_item orelse return null;
        return switch (item) {
            .Bookmarklet => |bookmarklet| bookmarklet,
            else => error.ExpectedBookmarklet,
        };
    }
};

fn exportTree(
    arena: std.mem.Allocator,
    writer: std.io.AnyWriter,
    root_path: []const u8,
    metadata: ?Bookmarklets,
) !void {
    var exporter: Export = .{
        .arena = arena,
        .writer = writer,
    };
    try exporter.exportRoot(root_path, metadata);
}

const Export = struct {
    const State = enum {
        begin_data,
        in_attributes,
        in_internal_element,
        in_leaf_element,
    };

    arena: std.mem.Allocator,
    writer: std.io.AnyWriter,
    indent_size: usize = 2,
    nesting_level: usize = 0,
    state: State = .begin_data,

    pub fn exportRoot(self: *Export, root_path: []const u8, metadata: ?Bookmarklets) !void {
        try self.writer.writeAll("<!DOCTYPE NETSCAPE-Bookmark-file-1>");
        try self.writer.writeAll("\n<!-- This is a generated file! -->");
        try self.openTagAndAttributes("META");
        try self.attribute("HTTP-EQUIV", "Content-Type");
        try self.attribute("CONTENT", "text/html; charset=UTF-8");
        try self.finishVoid();
        try self.openTag("DL");
        try self.exportDir(fs.cwd(), root_path, .{
            .title = "Bookmarklets",
            .items = if (metadata) |m| m.items else .{},
        });
        try self.closeTag("DL");
    }

    const Error = anyerror;

    fn exportDir(self: *Export, dir: fs.Dir, path: []const u8, metadata: ?Folder) Error!void {
        var sub_dir = try dir.openDir(path, .{ .iterate = true });
        defer sub_dir.close();

        try self.openTag("DT");
        try self.openTag("H3");
        try self.data(if (metadata) |m| m.title else path);
        try self.closeTag("H3");
        try self.openTag("DL");
        try self.exportDirEntries(sub_dir, if (metadata) |m| m.items else .{});
        try self.closeTag("DL");
        try self.closeTag("DT");
    }

    fn exportDirEntries(self: *Export, dir: fs.Dir, items: Map(Item)) !void {
        // Save the entries into a temporary array list.
        var entries: std.ArrayListUnmanaged(Entry) = .empty;
        var iterator = dir.iterateAssumeFirstIteration();
        while (try iterator.next()) |entry| {
            const name = try self.arena.dupe(u8, entry.name);
            try entries.append(self.arena, .{ .name = name, .kind = entry.kind });
        }

        // Entry names are unique, so an unstable sort is acceptable.
        std.mem.sortUnstable(Entry, entries.items, items, Entry.lessThan);

        // Now we can export the entries in a consistent order.
        const fields = items.fields;
        for (entries.items) |entry| {
            const name = entry.name;
            const metadata = fields.get(name);
            switch (entry.kind) {
                .directory => try self.exportDir(dir, name, try Folder.from(metadata)),
                .file => try self.exportFile(dir, name, try Bookmarklet.from(metadata)),
                else => continue,
            }
        }
    }

    // In case `fs.Dir.Entry` changes, we have our own `Entry` structure that
    // only stores the information that we need: name and kind.
    const Entry = struct {
        name: []const u8,
        kind: fs.Dir.Entry.Kind,

        pub fn lessThan(items: Map(Item), lhs: Entry, rhs: Entry) bool {
            assert(!std.mem.eql(u8, lhs.name, rhs.name));
            const lhs_item = items.fields.get(lhs.name);
            const rhs_item = items.fields.get(rhs.name);
            const lhs_title = if (lhs_item) |item| switch (item) {
                inline else => |metadata| metadata.title,
            } else lhs.name;
            const rhs_title = if (rhs_item) |item| switch (item) {
                inline else => |metadata| metadata.title,
            } else rhs.name;
            const order = std.ascii.orderIgnoreCase(lhs_title, rhs_title);
            if (order == .eq) {
                std.debug.panic(
                    "Entries '{s}' and '{s}' have the same (case-insensitive) title: '{s}'",
                    .{ lhs.name, rhs.name, lhs_title },
                );
            }
            return order == .lt;
        }
    };

    fn exportFile(self: *Export, dir: fs.Dir, path: []const u8, metadata: ?Bookmarklet) !void {
        const max_bytes = std.math.maxInt(usize);
        const link = try dir.readFileAlloc(self.arena, path, max_bytes);
        try self.openTag("DT");
        try self.openTagAndAttributes("A");
        try self.attribute("HREF", link);
        try self.finishAttributes();
        try self.data(if (metadata) |m| m.title else path);
        try self.closeTag("A");
        try self.closeTag("DT");
    }

    fn stateIsOneOf(self: Export, states: []const State) bool {
        return std.mem.indexOfScalar(State, states, self.state) != null;
    }

    fn nextLine(self: Export) !void {
        const current_indent = self.nesting_level * self.indent_size;
        try self.writer.writeByte('\n');
        try self.writer.writeByteNTimes(' ', current_indent);
    }

    /// Assumes that `name` is a legal HTML tag name.
    fn openTag(self: *Export, name: []const u8) !void {
        try self.openTagAndAttributes(name);
        try self.finishAttributes();
    }

    /// Assumes that `name` is a legal HTML tag name.
    fn openTagAndAttributes(self: *Export, name: []const u8) !void {
        assert(self.stateIsOneOf(&.{ .begin_data, .in_internal_element }));
        try self.nextLine();
        try self.writer.print("<{s}", .{name});
        self.nesting_level += 1;
        self.state = .in_attributes;
    }

    /// Assumes that `name` is a legal HTML tag name.
    /// Assumes that `self.nesting_level` is greater than zero.
    fn closeTag(self: *Export, name: []const u8) !void {
        assert(self.stateIsOneOf(&.{ .begin_data, .in_internal_element, .in_leaf_element }));
        self.nesting_level -= 1;
        // Put closing tags for non-leaf elements on their own lines.
        if (self.state == .in_internal_element)
            try self.nextLine();
        try self.writer.print("</{s}>", .{name});
        self.state = .in_internal_element;
    }

    /// Assumes that `name` is a legal HTML attribute name.
    // https://html.spec.whatwg.org/multipage/parsing.html#attribute-value-(double-quoted)-state
    fn attribute(self: Export, name: []const u8, value: []const u8) !void {
        assert(self.state == .in_attributes);
        try self.writer.print(" {s}=\"", .{name});
        try self.escape(value, "\"&");
        try self.writer.writeByte('"');
    }

    fn finishAttributes(self: *Export) !void {
        assert(self.state == .in_attributes);
        try self.writer.writeByte('>');
        self.state = .begin_data;
    }

    fn finishVoid(self: *Export) !void {
        assert(self.state == .in_attributes);
        try self.writer.writeByte('>');
        self.nesting_level -= 1;
        self.state = .in_internal_element;
    }

    // https://html.spec.whatwg.org/multipage/parsing.html#data-state
    fn data(self: *Export, bytes: []const u8) !void {
        assert(self.stateIsOneOf(&.{ .begin_data, .in_leaf_element }));
        try self.escape(bytes, "&<");
        self.state = .in_leaf_element;
    }

    fn escape(self: Export, bytes: []const u8, must_escape: []const u8) !void {
        var remaining = bytes;
        while (std.mem.indexOfAny(u8, remaining, must_escape)) |index| {
            try self.writer.writeAll(remaining[0..index]);
            try self.writer.writeAll(escapeByte(remaining[index]));
            remaining = remaining[index + 1 ..];
        }
        try self.writer.writeAll(remaining);
    }

    // Only return character references that Chromium can correctly unescape.
    // https://chromium.googlesource.com/chromium/src.git/+/a63238f367/base/strings/escape.cc#627
    fn escapeByte(byte: u8) []const u8 {
        return switch (byte) {
            '&' => "&amp;",
            '<' => "&lt;",
            '"' => "&quot;",
            else => unreachable,
        };
    }
};
