const std = @import("std");
const Build = std.Build;

pub fn build(b: *Build) !void {
    const generate_exe = b.addExecutable(.{
        .name = "generate",
        .root_source_file = b.path("build/generate.zig"),
        .target = b.graph.host,
        .optimize = .ReleaseSafe,
    });

    // NOTE: Using `addWriteFiles` will bloat the cache directory, but
    // eventually I want to do additional processing on the bookmarklets, so
    // `addWriteFiles` is the correct choice.
    const bookmarklets = b.addWriteFiles();
    b.getInstallStep().dependOn(&b.addInstallDirectory(.{
        .source_dir = bookmarklets.getDirectory(),
        .install_dir = .prefix,
        .install_subdir = "",
    }).step);

    const build_root = b.build_root.handle;
    var source_dir = try build_root.openDir("src", .{ .iterate = true });
    defer source_dir.close();

    var walker = try source_dir.walk(b.allocator);
    defer walker.deinit();
    while (try walker.next()) |entry| {
        if (entry.kind != .file)
            continue;

        const generate_run = b.addRunArtifact(generate_exe);
        const source_path = try b.path("src").join(b.allocator, entry.path);
        generate_run.addFileArg(source_path);

        const output_path = generate_run.captureStdOut();
        _ = bookmarklets.addCopyFile(output_path, entry.path);
    }
}
