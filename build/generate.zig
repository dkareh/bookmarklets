const std = @import("std");
const Child = std.process.Child;
const run = Child.run;

pub fn main() !void {
    var arena_state = std.heap.ArenaAllocator.init(std.heap.page_allocator);
    defer arena_state.deinit();
    const arena = arena_state.allocator();

    const args = try std.process.argsAlloc(arena);
    const source_path = if (args.len > 1) args[1] else {
        std.log.err("no source path provided", .{});
        return error.NoSourcePath;
    };

    const argv = .{ "minify", "--type", "js", source_path };
    const result = try run(.{ .allocator = arena, .argv = &argv });
    if (result.stderr.len != 0) {
        std.log.err("unexpected error message:\n{s}", .{result.stderr});
        return error.UnexpectedErrorMessage;
    }

    const direct_writer = std.io.getStdOut().writer();
    var buffered_writer = std.io.bufferedWriter(direct_writer);
    const writer = buffered_writer.writer();
    var remaining = result.stdout;
    try writer.writeAll("javascript:");
    while (std.mem.indexOfAny(u8, remaining, "%\n")) |index| {
        try writer.writeAll(remaining[0..index]);
        try writer.print("%{X:0>2}", .{remaining[index]});
        remaining = remaining[index + 1 ..];
    }
    try writer.writeAll(remaining);
    try buffered_writer.flush();
}
