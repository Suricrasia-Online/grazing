#!/usr/bin/python3

def ggx(x, roughness):
	a = x * roughness;
	k = roughness / (1.0 - x * x + a * a);
	return k * k * (1.0 / 3.1415);

for x in range(-1000,1000):
	print(x/1000.,",",ggx(x/1000.,.4));
