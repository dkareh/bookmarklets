const std = @import("std");
const builtin = @import("builtin");
const Build = std.Build;

const required_zig_version = std.SemanticVersion.parse("0.14.0") catch unreachable;

pub fn build(b: *Build) !void {
    if (comptime builtin.zig_version.order(required_zig_version) != .eq) {
        @compileError(std.fmt.comptimePrint(
            "Zig version {} is required",
            .{required_zig_version},
        ));
    }

    const ziggy_dep = b.dependency("ziggy", .{
        .target = b.graph.host,
        .optimize = .Debug,
    });
    const ziggy_exe = ziggy_dep.artifact("ziggy");
    const ziggy_mod = ziggy_dep.module("ziggy");
    const schema = "meta/bookmarklets.ziggy-schema";

    const fmt_step = b.step("fmt", "Format source files");
    fmt_step.dependOn(&b.addFmt(.{ .paths = &.{"."} }).step);

    const ziggy_fmt_run = b.addRunArtifact(ziggy_exe);
    ziggy_fmt_run.addArgs(&.{ "fmt", "--schema", schema, "meta" });
    fmt_step.dependOn(&ziggy_fmt_run.step);

    const test_fmt_step = b.step("test-fmt", "Check formatting of source files");
    test_fmt_step.dependOn(&b.addFmt(.{ .paths = &.{"."}, .check = true }).step);

    const ziggy_check_fmt_run = b.addRunArtifact(ziggy_exe);
    ziggy_check_fmt_run.addArgs(&.{ "fmt", "--check", "--schema", schema, "meta" });
    test_fmt_step.dependOn(&ziggy_check_fmt_run.step);

    if (b.findProgram(&.{"biome"}, &.{})) |biome| {
        fmt_step.dependOn(&b.addSystemCommand(&.{ biome, "format", "--fix" }).step);
        test_fmt_step.dependOn(&b.addSystemCommand(&.{ biome, "format" }).step);
    } else |_| {
        // Don't quit just because the user hasn't installed Biome.
    }

    const generate_exe = b.addExecutable(.{
        .name = "generate",
        .root_module = b.createModule(.{
            .root_source_file = b.path("build/generate.zig"),
            .target = b.graph.host,
        }),
    });

    const export_exe = b.addExecutable(.{
        .name = "export",
        .root_module = b.createModule(.{
            .root_source_file = b.path("build/export.zig"),
            .target = b.graph.host,
            .imports = &.{
                .{ .name = "ziggy", .module = ziggy_mod },
            },
        }),
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
        generate_run.addFileArg(b.path("src").path(b, entry.path));

        const output_path = generate_run.captureStdOut();
        _ = bookmarklets.addCopyFile(output_path, entry.path);
    }

    const export_run = b.addRunArtifact(export_exe);
    export_run.addDirectoryArg(bookmarklets.getDirectory());
    export_run.addFileArg(b.path("meta/bookmarklets.ziggy"));

    const html_path = export_run.captureStdOut();
    const install_html = b.addInstallFile(html_path, "bookmarks.html");
    b.getInstallStep().dependOn(&install_html.step);
}
