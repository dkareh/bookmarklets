const std = @import("std");
const Child = std.process.Child;
const fatal = std.process.fatal;
const run = Child.run;

pub fn main() !u8 {
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
    if (try reportErrors(result)) |code| return code;

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
    return 0;
}

fn indexOfUnsafeByte(bytes: []const u8) ?usize {
    for (bytes, 0..) |byte, i| {
        if (std.ascii.isControl(byte) or byte == '%')
            return i;
    }
    return null;
}

fn reportErrors(result: Child.RunResult) !?u8 {
    const messages = std.mem.trim(u8, result.stderr, &std.ascii.whitespace);
    if (messages.len != 0) {
        var stderr_buffer: [4096]u8 = undefined;
        var stderr_writer = std.fs.File.stderr().writer(&stderr_buffer);
        const stderr = &stderr_writer.interface;
        try stderr.print("{s}\n", .{messages});
        try stderr.flush();
        return 1;
    }
    return null;
}
