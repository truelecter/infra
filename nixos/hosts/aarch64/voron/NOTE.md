# CM4 with Waveshare 5" DSI on Manta M8P 1.0

There are some modifications to configs needed. For CM4 with Waveshare DSI crucial are:

- DONE: add dtparam=ant2 (this may be done with overlays instead, may be)
- add start_x=1
- dt_blob.bin for DSI1

The example of latest known working config.txt

```ini
[pi3]
kernel=u-boot-rpi3.bin

[pi02]
kernel=u-boot-rpi3.bin

[pi4]
kernel=u-boot-rpi4.bin
enable_gic=1
armstub=armstub8-gic.bin

# Otherwise the resolution will be weird in most cases, compared to
# what the pi3 firmware does by default.
disable_overscan=1

# Supported in newer board revisions
arm_boost=1

# Try 2711 XHCI USB for camera
# otg_mode=1

[cm4]
# Enable host mode on the 2711 built-in XHCI USB controller.
# This line should be removed if the legacy DWC2 controller is required
# (e.g. for USB device mode) or if USB support is not required.
otg_mode=1

[all]
# Boot in 64-bit mode.
arm_64bit=1

# U-Boot needs this to work, regardless of whether UART is actually used or not.
# Look in arch/arm/mach-bcm283x/Kconfig in the U-Boot tree to see if this is still
# a requirement in the future.
enable_uart=1

# Prevent the firmware from smashing the framebuffer setup done by the mainline kernel
# when attempting to show low-voltage or overtemperature warnings.
avoid_warnings=1

#over_voltage=2
#gpu_freq=200
start_x=1
gpu_mem=256
max_framebuffers=2
```
