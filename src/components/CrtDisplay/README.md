# CRT display

The owner-adopted display treatment covers every app route and root-mounted dialog.
One radial light spot per logical pixel follows `#root` scaling without tracking
viewport coordinates. The overlay is decorative, static and pointer-transparent.

Settings uses the existing Spinner to persist intensity immediately on this device.
The default is 80%; zero removes the overlay entirely. Keep the original colors:
do not add brightness or saturation compensation. The owner evaluates mask darkening
before deciding whether any colors need changing. Artwork, source palette, layout
and fixed-dialog containing blocks stay unchanged.

This CSS treatment approximates phosphor spots rather than simulating CRT hardware.
NES composition proofs apply to the unfiltered source image; set intensity to zero
before capturing one. Browser checks cover scaled display output and interaction.
