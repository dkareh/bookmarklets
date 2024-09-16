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
        const metadata_path = args[2];
        const max_bytes = std.math.maxInt(usize);
        const code = try fs.cwd().readFileAllocOptions(
            arena,
            metadata_path,
            max_bytes,
            null,
            1,
            0,
        );
        break :blk try ziggy.parseLeaky(Bookmarklets, arena, code, .{});
    } else null;

    const direct_writer = std.io.getStdOut().writer();
    var buffered_writer = std.io.bufferedWriter(direct_writer);
    const writer = buffered_writer.writer();
    try exportTree(arena, writer.any(), root_path, metadata);
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
    const indent_size = 2;
    const State = enum {
        begin_data,
        in_attributes,
        in_internal_element,
        in_leaf_element,
    };

    arena: std.mem.Allocator,
    writer: std.io.AnyWriter,
    nesting_level: usize = 0,
    state: State = .begin_data,

    pub fn exportRoot(self: *Export, root_path: []const u8, metadata: ?Bookmarklets) !void {
        try self.emitDoctype();
        try self.emitGeneratedFileWarning();
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
        var iterator = dir.iterate();
        const fields = items.fields;
        while (try iterator.next()) |entry| {
            const name = entry.name;
            const metadata = fields.get(name);
            switch (entry.kind) {
                .directory => try self.exportDir(dir, name, try Folder.from(metadata)),
                .file => try self.exportFile(dir, name, try Bookmarklet.from(metadata)),
                else => continue,
            }
        }
    }

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
        try self.writer.writeByte('\n');
        try self.writer.writeByteNTimes(' ', self.nesting_level * indent_size);
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
    fn attribute(self: Export, name: []const u8, value: []const u8) !void {
        assert(self.state == .in_attributes);
        try self.writer.print(" {s}=\"", .{name});
        try self.escapeAttributeValue(value);
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

    fn emitDoctype(self: *Export) !void {
        try self.writer.writeAll("<!DOCTYPE NETSCAPE-Bookmark-file-1>");
    }

    fn emitGeneratedFileWarning(self: *Export) !void {
        try self.writer.writeAll("\n<!-- This is a generated file! -->");
    }

    fn data(self: *Export, bytes: []const u8) !void {
        assert(self.stateIsOneOf(&.{ .begin_data, .in_leaf_element }));
        try self.escapeData(bytes);
        self.state = .in_leaf_element;
    }

    // https://html.spec.whatwg.org/multipage/parsing.html#data-state
    fn escapeData(self: Export, bytes: []const u8) !void {
        var remaining = bytes;
        while (std.mem.indexOfAny(u8, remaining, "&<")) |index| {
            try self.writer.writeAll(remaining[0..index]);
            try self.writer.writeAll(htmlEscape(remaining[index]));
            remaining = remaining[index + 1 ..];
        }
        try self.writer.writeAll(remaining);
    }

    // https://html.spec.whatwg.org/multipage/parsing.html#attribute-value-(double-quoted)-state
    fn escapeAttributeValue(self: Export, value: []const u8) !void {
        var remaining = value;
        while (std.mem.indexOfAny(u8, remaining, "\"&")) |index| {
            try self.writer.writeAll(remaining[0..index]);
            try self.writer.writeAll(htmlEscape(remaining[index]));
            remaining = remaining[index + 1 ..];
        }
        try self.writer.writeAll(remaining);
    }

    // Only return character references that Chromium can correctly unescape.
    // https://chromium.googlesource.com/chromium/src.git/+/a63238f367/base/strings/escape.cc#627
    fn htmlEscape(byte: u8) []const u8 {
        return switch (byte) {
            '&' => "&amp;",
            '<' => "&lt;",
            '"' => "&quot;",
            else => unreachable,
        };
    }
};
