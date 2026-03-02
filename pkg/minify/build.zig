const std = @import("std");
const builtin = @import("builtin");
const Build = std.Build;

const minimum_zig_version = std.SemanticVersion.parse(
    @import("build.zig.zon").minimum_zig_version,
) catch unreachable;

pub fn build(b: *Build) !void {
    if (comptime builtin.zig_version.order(minimum_zig_version).compare(.lt)) {
        @compileError(std.fmt.comptimePrint(
            "Zig version {} or later is required.",
            .{minimum_zig_version},
        ));
    }

    const target = b.standardTargetOptions(.{});

    const maybe_dependency_name: ?[]const u8 = if (target.result.os.tag.isDarwin())
        switch (target.result.cpu.arch) {
            .aarch64 => "darwin_aarch64",
            .x86_64 => "darwin_x86_64",
            else => null,
        }
    else switch (target.result.os.tag) {
        .driverkit, .ios, .macos, .tvos, .visionos, .watchos => unreachable,
        .freebsd => switch (target.result.cpu.arch) {
            .x86_64 => "freebsd_x86_64",
            else => null,
        },
        .linux => switch (target.result.cpu.arch) {
            .aarch64 => "linux_aarch64",
            .x86_64 => "linux_x86_64",
            else => null,
        },
        .netbsd => switch (target.result.cpu.arch) {
            .x86_64 => "netbsd_x86_64",
            else => null,
        },
        .openbsd => switch (target.result.cpu.arch) {
            .x86_64 => "openbsd_x86_64",
            else => null,
        },
        .windows => switch (target.result.cpu.arch) {
            .x86_64 => "windows_x86_64",
            else => null,
        },
        else => null,
    };

    const dependency_name = maybe_dependency_name orelse {
        const triple = try target.result.zigTriple(b.allocator);
        const message = b.fmt("prebuilt executable unavailable for target {s}", .{triple});
        b.getInstallStep().dependOn(&b.addFail(message).step);
        return;
    };

    if (b.lazyDependency(dependency_name, .{})) |minify_dep| {
        const minify_exe = minify_dep.path(b.fmt("minify{s}", .{target.result.exeFileExt()}));
        b.addNamedLazyPath("minify_exe", minify_exe);
    } else {
        // ISSUE: https://github.com/ziglang/zig/issues/25527
        b.addNamedLazyPath("minify_exe", b.path(""));
    }
}
