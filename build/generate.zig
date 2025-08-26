const std = @import("std");
const Child = std.process.Child;
const run = Child.run;

pub fn main() !void {
    var arena_state: std.heap.ArenaAllocator = .init(std.heap.page_allocator);
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

    var stdout_buffer: [4096]u8 = undefined;
    var stdout_writer = std.fs.File.stdout().writer(&stdout_buffer);
    const stdout = &stdout_writer.interface;
    var remaining = result.stdout;
    try stdout.writeAll("javascript:");
    while (indexOfUnsafeByte(remaining)) |index| {
        try stdout.writeAll(remaining[0..index]);
        try stdout.print("%{X:0>2}", .{remaining[index]});
        remaining = remaining[index + 1 ..];
    }
    try stdout.writeAll(remaining);
    try stdout.flush();
}

fn indexOfUnsafeByte(bytes: []const u8) ?usize {
    for (bytes, 0..) |byte, i| {
        if (std.ascii.isControl(byte) or byte == '%')
            return i;
    }
    return null;
}
