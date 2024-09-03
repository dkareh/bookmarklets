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

    var root_dir = try fs.cwd().openDir(root_path, .{ .iterate = true });
    defer root_dir.close();

    const direct_writer = std.io.getStdOut().writer();
    var buffered_writer = std.io.bufferedWriter(direct_writer);
    const writer = buffered_writer.writer();
    try exportTree(arena, writer.any(), root_dir);
    try buffered_writer.flush();
}

fn exportTree(
    arena: std.mem.Allocator,
    writer: std.io.AnyWriter,
    root_dir: fs.Dir,
) !void {
    var exporter: Export = .{
        .arena = arena,
        .writer = writer,
        .root_dir = root_dir,
    };
    try exporter.exportRoot();
}

const Export = struct {
    arena: std.mem.Allocator,
    writer: std.io.AnyWriter,
    root_dir: fs.Dir,

    pub fn exportRoot(self: Export) !void {
        try self.writer.writeAll(header);
        try self.exportDir(self.root_dir);
        try self.writer.writeAll(footer);
    }

    fn exportDir(self: Export, dir: fs.Dir) !void {
        var walker = try dir.walk(self.arena);
        defer walker.deinit();
        while (try walker.next()) |entry| {
            if (entry.kind != .file)
                continue;
            try self.exportFile(dir, entry.path);
        }
    }

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
            try self.writer.print("&#x{X};", .{remaining[index]});
            remaining = remaining[index + 1 ..];
        }
        try self.writer.writeAll(remaining);
    }

    // https://html.spec.whatwg.org/multipage/parsing.html#attribute-value-(double-quoted)-state
    fn exportLink(self: Export, link: []const u8) !void {
        var remaining = link;
        while (std.mem.indexOfAny(u8, remaining, "\"&")) |index| {
            try self.writer.writeAll(remaining[0..index]);
            try self.writer.print("&#x{X};", .{remaining[index]});
            remaining = remaining[index + 1 ..];
        }
        try self.writer.writeAll(remaining);
    }

    const header =
        \\<!DOCTYPE NETSCAPE-Bookmark-file-1>
        \\<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8" />
        \\<DL>
        \\  <DT>
        \\    <H3>Bookmarklets</H3>
        \\    <DL>
        \\
    ;

    const footer =
        \\    </DL>
        \\  </DT>
        \\</DL>
    ;
};
