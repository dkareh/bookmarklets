const std = @import("std");
const fs = std.fs;

pub fn main() !void {
    var arena_state = std.heap.ArenaAllocator.init(std.heap.page_allocator);
    defer arena_state.deinit();
    const arena = arena_state.allocator();

    const args = try std.process.argsAlloc(arena);
    const root_path = if (args.len > 1) args[1] else {
        std.log.err("no root path provided", .{});
        return error.NoRootPath;
    };

    const direct_writer = std.io.getStdOut().writer();
    var buffered_writer = std.io.bufferedWriter(direct_writer);
    const writer = buffered_writer.writer();
    try exportTree(arena, writer.any(), root_path);
    try buffered_writer.flush();
}

fn exportTree(
    arena: std.mem.Allocator,
    writer: std.io.AnyWriter,
    root_path: []const u8,
) !void {
    var exporter: Export = .{
        .arena = arena,
        .writer = writer,
        .root_path = root_path,
    };
    try exporter.exportRoot();
}

const Export = struct {
    arena: std.mem.Allocator,
    writer: std.io.AnyWriter,
    root_path: []const u8,

    pub fn exportRoot(self: Export) !void {
        try self.writer.writeAll(header);
        try self.exportSubDir(fs.cwd(), self.root_path, "Bookmarklets");
        try self.writer.writeAll(footer);
    }

    const Error = anyerror;

    // FIXME: Indent HTML correctly.
    fn exportSubDir(self: Export, dir: fs.Dir, path: []const u8, name: []const u8) Error!void {
        var sub_dir = try dir.openDir(path, .{ .iterate = true });
        defer sub_dir.close();

        try self.writer.writeAll("  <DT>\n    <H3>");
        try self.exportName(name);
        try self.writer.writeAll("</H3>\n    <DL>\n");
        try self.exportDir(sub_dir);
        try self.writer.writeAll("    </DL>\n  </DT>\n");
    }

    fn exportDir(self: Export, dir: fs.Dir) !void {
        var iterator = dir.iterate();
        while (try iterator.next()) |entry| {
            switch (entry.kind) {
                .directory => try self.exportSubDir(dir, entry.name, entry.name),
                .file => try self.exportFile(dir, entry.name),
                else => continue,
            }
        }
    }

    // FIXME: Indent HTML correctly.
    fn exportFile(self: Export, dir: fs.Dir, path: []const u8) !void {
        const max_bytes = std.math.maxInt(usize);
        const link = try dir.readFileAlloc(self.arena, path, max_bytes);
        try self.writer.writeAll("      <DT>\n        <A HREF=\"");
        try self.exportLink(link);
        try self.writer.writeAll("\">");
        try self.exportName(path);
        try self.writer.writeAll("</A>\n      </DT>\n");
    }

    // https://html.spec.whatwg.org/multipage/parsing.html#data-state
    fn exportName(self: Export, name: []const u8) !void {
        var remaining = name;
        while (std.mem.indexOfAny(u8, remaining, "&<")) |index| {
            try self.writer.writeAll(remaining[0..index]);
            try self.writer.writeAll(htmlEscape(remaining[index]));
            remaining = remaining[index + 1 ..];
        }
        try self.writer.writeAll(remaining);
    }

    // https://html.spec.whatwg.org/multipage/parsing.html#attribute-value-(double-quoted)-state
    fn exportLink(self: Export, link: []const u8) !void {
        var remaining = link;
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

    const header =
        \\<!DOCTYPE NETSCAPE-Bookmark-file-1>
        \\<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8" />
        \\<DL>
        \\
    ;

    const footer =
        \\</DL>
    ;
};
