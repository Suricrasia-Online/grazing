# ----------------------------------------
# HEY YOU! YEAH YOU! THE ONE READING THIS!
# ----------------------------------------
# Interested in demoscene on linux? join us in
# the Linux Sizecoding channel! #lsc on IRCNET!
# ----------------------------------------

# notes on the build system:
# ~$ uname -a
# Linux stardrifter 5.4.0-0.bpo.2-amd64 #1 SMP Debian 5.4.8-1~bpo10+1 (2020-01-07) x86_64 GNU/Linux
# ~$ gcc -dumpversion
# 8
# ~$ nasm --version
# NASM version 2.14
# ~$ lzma --version
# xz (XZ Utils) 5.2.4
# liblzma 5.2.4
# ~$ dpkg-query --showformat='${Version}' --show libglib2.0-dev
# 2.58.3-2+deb10u2
# ~$ dpkg-query --showformat='${Version}' --show libgtk-3-dev:amd64
# 3.24.5-1
# ~$ dpkg-query --showformat='${Version}' --show mesa-common-dev:amd64
# 18.3.6-2+deb10u1
# ~$ dpkg-query --showformat='${Version}' --show librsvg2-dev
# 2.44.10-2.1

PROJNAME := grazing

#huge greets to donnerbrenn!
CFLAGS = -Os -s -march=nocona -std=gnu11

CFLAGS += -fno-plt
CFLAGS += -fno-stack-protector -fno-stack-check
CFLAGS += -fno-unwind-tables -fno-asynchronous-unwind-tables -fno-exceptions
CFLAGS += -funsafe-math-optimizations -ffast-math
CFLAGS += -fomit-frame-pointer
CFLAGS += -ffunction-sections -fdata-sections
CFLAGS += -fmerge-all-constants
CFLAGS += -fno-PIC -fno-PIE
CFLAGS += -malign-data=cacheline
CFLAGS += -mno-fancy-math-387 -mno-ieee-fp
CFLAGS += -Wall
CFLAGS += -Wextra
CFLAGS += -no-pie

CFLAGS += -nostartfiles -nodefaultlibs
CFLAGS += `pkg-config --cflags gtk+-3.0` -I./cogl -I./cogl/cogl -I./cogl/cogl/winsys

LDFLAGS = -lc -lcogl -lglib-2.0 -lgobject-2.0 -lgtk-3 -lgdk-3 -lgdk_pixbuf-2.0

.PHONY: clean check_size

all : $(PROJNAME) $(PROJNAME)_unpacked check_size

$(PROJNAME).zip : $(PROJNAME) $(PROJNAME)_unpacked README.txt screenshot.jpg
	-rm $@
	zip $@ $^

oneKpaq/onekpaq :
	make -C oneKpaq/

shader.h : shader.frag Makefile
	mono ./shader_minifier.exe --no-renaming-list main,mx shader.frag -o shader.h

cogl/config.h : cogl/autogen.sh
	cd cogl; bash autogen.sh; make -j8

$(PROJNAME).o : $(PROJNAME).c shader.h Makefile cogl/config.h
	gcc -c -o $@ $< $(CFLAGS)

$(PROJNAME).elf.smol : $(PROJNAME).o
	python3 ./smol/smold.py --smolrt "$(PWD)/smol/rt" --smolld "$(PWD)/smol/ld" --det -fuse-interp -fno-align-stack -fuse-dnload-loader --crc32c --debugout $(PROJNAME).elf.smol.dbg --ldflags=-Wl,-Map=$(PROJNAME).elf.smol.map $(LDFLAGS) $< $@

$(PROJNAME)_unpacked : $(PROJNAME).c shader.h Makefile
	gcc -o $@ $< $(CFLAGS) $(LDFLAGS)

$(PROJNAME) : $(PROJNAME).elf.smol.packed
	mv $< $@

%.packed : % oneKpaq/onekpaq Makefile
	cd oneKpaq; ./onekpaq.py 3 3 ../$< ../$@; cd ..
	chmod +x $@

clean :
	-rm *.elf *.xz shader.h $(PROJNAME) $(PROJNAME)_unpacked

check_size :
	./sizelimit_check.sh $(PROJNAME)
