### grazing - blackle / suricrasia online ###
   fuckings to the petrochemical industry
BLACK LIVES MATTER - TRANS RIGHTS ARE HUMAN RIGHTS

"grazing" is a 4k exegfx for 64-bit linux

Packages needed (all of these are installed by default):

libglib2.0-0
libclutter-1.0-0
libcogl20
and whatever package gives you libgl (depends on graphics card)

Two versions of the demo are distributed. grazing is the size optimized, packed version. grazing_unpacked is the unpacked version that is missing some heavy size optimizations.

This exegfx renders an image with a resolution of 1920x1080. If your screen is a different resolution, the image will be stretched to fit.

Exit at any moment with "esc" or with your window manager's "close window" key combo. It may take 3-5 seconds for it to open a window, since it is decompressing.

You can set the number of samples with the environment variable SAMPLES:

env SAMPLES=150 ./grazing

The default number of samples is 150. It takes about 20 seconds to render on a 1660 Ti. You can also run in windowed mode, and also change the resolution:

env WINDOWED=1 RESOLUTION=800x450 ./grazing
