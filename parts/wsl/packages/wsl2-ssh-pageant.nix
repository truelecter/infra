{
  lib,
  sources,
  buildGoModule,
  ...
}:
# Windows binary (WSL runs it through interop), cross-built with Go's own toolchain.
buildGoModule {
  pname = "wsl2-ssh-pageant";
  version = "0-unstable-${builtins.substring 0 7 sources.wsl2-ssh-pageant.version}";

  inherit (sources.wsl2-ssh-pageant) src;

  vendorHash = "sha256-YxEoNWbhdkWFTC6k53ZHo0DaRtNUTHhOACi38mpw7+s=";

  env.CGO_ENABLED = 0;
  # GNU strip corrupts the PE file: Windows refuses to start it
  dontStrip = true;
  ldflags = ["-H=windowsgui"];

  preBuild = ''
    export GOOS=windows GOARCH=amd64
  '';

  doCheck = false;

  installPhase = ''
    runHook preInstall
    install -Dm755 "$GOPATH/bin/windows_amd64/wsl2-ssh-pageant.exe" "$out/bin/wsl2-ssh-pageant.exe"
    runHook postInstall
  '';

  meta = {
    description = "Bridge from WSL2 to Windows gpg-agent/pageant sockets";
    homepage = "https://github.com/BlackReloaded/wsl2-ssh-pageant";
    license = lib.licenses.mit;
    platforms = lib.platforms.linux;
  };
}
