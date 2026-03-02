const std = @import("std");
const Child = std.process.Child;
const fatal = std.process.fatal;
const run = Child.run;

pub fn main() !void {
    var arena_state: std.heap.ArenaAllocator = .init(std.heap.page_allocator);
    defer arena_state.deinit();
    const arena = arena_state.allocator();

    const args = try std.process.argsAlloc(arena);
    const minify_command_path = if (1 < args.len) args[1] else {
        fatal("path to `minify` command not provided", .{});
    };

    const source_path = if (2 < args.len) args[2] else {
        fatal("no source path provided", .{});
    };

    const argv = .{ minify_command_path, "--type", "js", "--", source_path };
    const result = try run(.{ .allocator = arena, .argv = &argv });
    if (result.stderr.len != 0) {
        fatal("unexpected error message:\n{s}", .{result.stderr});
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
