#version 420
#define cn(p) (length(max(p,0.)) + min(0.,mx(p)))
#define bx(p,d) cn(abs(p)-(d/2.))
//todo: make tr less..... like this
#define tr(p,r) (asin(sin((p)*r))/r)
#define rt ret_urn
#define ln len_gth
uniform int samples;
uniform vec2 resolution;
out vec4 fragCol;
// const vec2 vec2(3.4,4.1) = vec2(3.4,4.1);
//beam origin (yz plane)
// const vec2 vec2(-1.8,10.5500) = vec2(-1.8,10.5500);

//axis rotation functions. maybe there's a better way
vec3 xy(vec3 p,float r){p.xy*=mat2(cos(r),sin(r),-sin(r),cos(r));return p;}
vec3 yz(vec3 p,float r){p.yz*=mat2(cos(r),sin(r),-sin(r),cos(r));return p;}
vec3 xz(vec3 p,float r){p.xz*=mat2(cos(r),sin(r),-sin(r),cos(r));return p;}

float smin(float a, float b, float k) {
    float h = max(0.,k-abs(a-b))/k;
    return min(a,b)-h*h*h*k/6.;
}
//fancy repetition to make the dictionary compressor happy :3
float mx(vec2 p) {
    return max(p.x,p.y);
}
float mx(vec3 p) {
    return max(p.x,mx(p.yz));
}
float mx(vec4 p) {
    return max(p.x,mx(p.yzw));
}

float hex(vec2 p, vec3 rad) {
    vec3 p2 = vec3(.81,-.4,-.4)*p.y + vec3(0,-.71,.71)*p.x;
    return bx(p2,vec3(rad));
}

float feature(vec3 p, float d, float w, float t) {
    float body = cn(p.xy-vec2(-t,d)/2.); // main body or nothing
    float perp = bx(p.xy,vec2(t,w)); // perpendicular beam
    float supp = cn(vec3(p.x,abs(p.yz))-vec3(-t,mix(w,d,.3),t)/2.); // supporting beam
    return smin(min(supp,body),perp,t/2.)-0.0100;
}

//d.x = I extrusion depth, d.yz = body dimensions
//dp = depth of webbing
//t = I extrusion thickness
//y = greeble dimension
//o = 45deg cut offset
float obj(vec3 p, vec3 d, float dp, float t, float y, float o) {
    float body = -smin(-bx(p.yz,d.yz),(o+p.y-p.z)*.71,0.0500);
    return feature(vec3(body,abs(p.x),y),dp,d.x,t);
}


float walking_beam(vec3 p) {
    float d = length(p.yz);
    p.z -= .15;
    vec3 p2 = p;
    p2.y=abs(p2.y+2.3)-2.3;
    float bearing = bx(vec2(length(p2.yz),p2.x),vec2(0.1600,0.7000))-0.0200;
    p2.z+=mx(-abs(p2.xy))*.4;
    bearing = min(bearing, bx(p2,vec3(0.4000,0.7000,0.2000))-0.0200);
    //bearing = min(bearing, bx(p+vec3(0,4.6,mx(-abs(p.xy))*.4),vec3(0.4000,0.7000,0.2000))-0.0200);
    bearing=-smin(abs(p.x)-0.1000,-bearing,0.0100);
    
    p.z -= .80;
    float beam = obj(p,vec3(0.5000,10.,1.2),
        0.02,0.02,abs(abs(p.y)-.7)-.5,4.8);
    
    p.y -= 4.5;
    float headsh = -smin(-abs(p.z+1.+p.y*.2)+3.,-max(d-6., -p.y),0.1000); //todo: make head better with better greebles
    //feature(vec3(head,abs(abs(p.x)-0.3600),0.),0.1000,0.02,0.02);
    float head=cn(vec2(headsh,abs(abs(p.x)-0.3600)))-0.02;
    head=min(head,cn(vec3(abs(headsh+0.0500),abs(p.x)-0.4200,-tr(p.z-0.5000,2.8))))-0.02;
    p.y -= .4;
    p.z = abs(p.z)-.4;
    head=min(head,bx(vec2(length(p.yz),p.x),vec2(0.0800,1.0000))-0.0100);
    p.z-=3.2;p.y-=0.0500;
    head=-smin(-head,length(p.yz)-0.1000,0.0200);
    return min(min(bearing, beam),head);

}

// float ladder(vec3 p) {
//     return obj(p,vec3(0.0700,10.5,.4),
//         -0.0800,0.02,tr(p.y,10.),1e4);
// }

float ladder_all(vec3 p) {
    vec3 p2 = p.yzx;
    p-=vec3(0,0.3000,2.);
    p=vec3(length(p.xy)-0.3500,atan(p.x,p.y)/3.2,p.z);
    return min(obj(p2,vec3(0.0700,10.5,.4),
        -0.0800,0.02,tr(p2.y,10.),1e4),
        obj(p,vec3(0.0700,1.5,8.),
        -0.1700,0.02,min(abs(tr(p.y,10.)),abs(tr(p.z,3.))),1e4));
    // return obj(p2,vec3(0.0700,10.5,.4),
    //     -0.0800,0.02,tr(p2.y,10.),1e4);
    // return obj(p,vec3(0.0700,1.5,8.),
    //     -0.1700,0.02,min(abs(tr(p.y,10.)),abs(tr(p.z,3.))),1e4);
}

// float ladder_all(vec3 p) {
//     float l = ladder(p.yzx);
//     float c = cage(p);
//     return min(c,l);
// }

float chonker(vec3 p) {
    p.y-=2.7;
    p.z-=2.02;
    return obj(p,vec3(1.5,3.,2.3),
        1.3,0.02,abs(tr(p.y,4.3))-0.1400,1.6);
}

float base(vec3 p) {
    p.z -= 0.3800;
    float front = obj(p.yxz-vec3(-3.9,0,0),vec3(0.3600,2.9,0.9500),
        0.02,0.02,p.y,1e4);
    p.x=abs(p.x);
    p.xy-=vec2(0.5500, 1.);
    float sides = obj(p.xyz,vec3(0.3300,9.3,0.900),
        0.02,0.02,p.y-1.,1e4);
    return min(front,sides);
}

float legs(vec3 p) {
    vec3 p2 = p;
    vec3 p3 = p;
    p.x = abs(p.x)-.77;
    p.y -= -2.93;
    p.z -= 5.5;
    p.y -= p.z*.22;
    p.x -= p.z*-.11;
    float leg = obj(p,vec3(0.3000,0.3600,9.2),
        0.02,0.02,p.y,1e4);
    p2.y -= 0.2;
    p2.z -= 6.4;
    p2=yz(p2,.45);
    float otherleg = obj(p2,vec3(0.3000,0.3600,8.2),
        0.02,0.02,p2.z,1e4);
    p3.z-=10.17;p3.y-=-1.7;
    float base = bx(p3,vec3(0.8000,0.8000,0.06))-0.0100;
    //todo: bearing between beam and legs
    float oz = p3.z;
    p3=yz(p3,.78);
    p3.z-=0.1000;p3.x=abs(abs(p3.x)-0.1500)-0.1500;
    float bearing=max(-oz,bx(p3,vec3(0.1000,0.6000,0.6000)))-0.0100;
    return min(min(min(base,bearing),otherleg),leg);
}

// float back_bench(vec3 p) {
//     //float k = length(vec2(length(p.xz-vec2(.5,1.6))-0.2000,p.y-6.1))-0.0150; //random ring for visual interest
//     float ox = p.x;
//     p.x = abs(p.x)-.5;
//     p.y -= 5.;
//     p.z -= 1.8;
//     p.y=-abs(p.y);
//     p.yz-=min(dot(p.yz,vec2(-.4,.85))*2.,0.)*vec2(-.4,.85);
//     float b = bx(p,vec3(0.2000,2.3,0.02));
//     p.z-=0.0500;p.y=abs(p.y)-0.7000;p.y=abs(p.y)-0.2000;p.x+=0.4000;
//     b = min(b, bx(p,vec3(1.,0.2000,0.02)) );
//     //p.x-=0.4000;
//     //vec2 crds = vec2(length(p.xy),p.z+0.0200);
//     //b = min(b, bx(crds,vec2(0.0200,0.1200)) );
//     return b-0.0100;
//     //return min(b-0.0100,k);
// }
float fence(vec3 p) {
    float oy = p.y;
    p.z -= 1.1; p.y -= 2.;p.xy=abs(p.xy);p.z*=-1.;
    vec3 crds = vec3(bx(p.xy,vec2(4.4,10.)),atan(p.x,p.y)*4.3,p.z);
    float rep =-mx(-abs(tr(p,vec3(2.1,2.53,8.))));
    return obj(crds, vec3(0.0500, 50., 2.3), -0.1500, 0.02, rep,oy*.2);
}

float gearbx(vec3 p) {
    p.yz -= vec2(3.4,4.1);
    //return bx(p,vec3(1.4,3.,2.));
    float b = cn(vec2(hex(p.yz,vec3(1)),abs(p.x)-.5))-0.1000;
    b = smin(bx(vec2(length(p.yz),p.x),vec2(0.4000,2.2)),b,0.6000);
    p.z -= -.83;
    float c = bx(p,vec3(1.2, 1.6, 0.0800))-0.0500;
    p.y -= 1.;
    p.z -= .5;
    p.x-=0.0500;
    b = smin(b, cn(vec2(hex(p.yz,vec3(.5)),abs(p.x)-.3))-0.1000, 0.2000);
    b = smin(bx(vec2(length(p.yz),p.x),vec2(0.2500,1.3))-0.0500,b,0.3000);
    b = smin(b,c,0.4000);
    //b = -smin(-b,abs(p.z),0.0200);
    //p.z-=.6;
    //b = -smin(-b,abs(p.z),0.0200);
    vec3 p2 = p,p3=p;
    p.y=abs(p.y)-.4;
    p.x = abs(p.x)-0.1300;
    b = -smin(-b,length(p.yx)-0.0500,0.0200);
    p2.x-=.7;
    p2=yz(p2,-.9);
    p2.y-=1.;
    b = min(b, cn(vec2(hex(p2.yz,vec3(.5-p2.y*.2,1.8,1.8))-.2,abs(p2.x)-.15))-0.0100);
    p3.y-=1.0;
    p3.z+=1.6;
    p3.x+=.1;
    b = min(b, cn(vec2(length(p3.yz)-.35+sin(atan(p3.y,p3.z)*20.)*.01,abs(p3.x)-.55))-0.05);
    b = min(b, max(p3.z,length(abs(p3.xy)-vec2(.55,.3))-.1));
    return b;
}
//https://twitter.com/AmigaBeanbag/status/1510713873799786503
float tex(vec3 x) {
  return dot(vec3(.3),sin(mat3(sin(x*32.),sin(x.zxy*43.),sin(x.yzx*52.))*vec3(3.)));
}

float counterweights(vec3 p, float ang) {
    p.yz -= vec2(3.4,4.1);
    p.x = abs(p.x)-1.2;
    p=yz(p,ang);
    float oy = p.y;
    float oz = p.z;
    p.z=abs(p.z);
    float l = length(p.yz);
    float cw = -smin(-2.-p.y, -(l-3.5), 0.4000);
    cw = -smin(-cw,-abs(p.z-1.3)+.84, 0.4000);
    cw = cn(vec2(cw, abs(p.x)-0.1500))-0.0400;
    vec3 p3 = p;
    p3.yz = tr(p3.yz,3.95);
    cw = -smin(length(p3.yz)-0.1000,-cw,0.0100);
    vec3 p2 = p;
    p2.y = abs(p.y+1.)-1.;
    float b2 = bx(vec2(length(p2.yz)-0.3500,p.x-0.0500),vec2(0.2200,.45))-0.0200;
    b2 = min(b2,bx(vec2(length(p2.yz),p.x),vec2(0.2900,.5))-0.0200);
    p.y+=1.6;
    float b = obj(p, vec3(0.3000, 4., .7), 0.3000-0.06, 0.1000,  tr(p.y, 2.), 2.1);
    p.z = oz-.8;
    p.y-=.7;
    b = -smin(length(p.yz)-0.5500, -b, 0.0600);
    b = smin(b, b2, 0.2000);
    b=-smin(abs(oy),-b,0.0500);
    return min(b, cw);
}



float equalizer(vec3 p) {
    p.yx=p.xy;
    float bearing=bx(vec2(length(p.xz),p.y),vec2(0.6000,0.0900))-0.0200;
    p.z-=.5;
    p.y=-abs(p.y);
    float oz=p.z;
    float eq = smin(obj(p,vec3(0.2500,3.5,.8),
        0.02,0.02,-p.y-.5,1.5), bearing,0.0500);
    p.z -= 2.8;
    p.y += 1.7;
    float arm = obj(p.yxz,vec3(0.2500,.4,6.9),
        0.02,0.02,p.x,1e4);
    p.z -= 3.1;
    arm = min(arm,bx(p,.4)-0.0100);
    arm = -smin(-arm,abs(p.z),0.0300);
    return min(max((-.45-oz<0.?.08:.02)-eq,arm),eq);
}


float wireline(vec3 p, float bz) {
    p -= vec3(0,-7.8,10.5);
    float carrierz = -16.+bz;
    float polish = max(length(p.xy)-0.0300,-0.5000-carrierz+p.z);
    float carrier = bx(vec2(length(p.xy),p.z-carrierz),vec2(0.3000,0.2000));
    p.x = abs(p.x)-0.2700;
    float bridle = max(length(p.xy)-0.0300,max(p.z,carrierz-p.z));
    p.z=abs(p.z-carrierz-0.1000)-0.1000;
    carrier=smin(carrier, bx(vec2(length(p.xy),p.z),vec2(0.2000,0.1000)),0.2000);
    return min(carrier-0.0100,min(bridle,polish));
}

vec2 poop(vec2 a, vec2 b, float d1, float d3) {
    float d2 = length(b-a);
    float p = (d1*d1+d2*d2-d3*d3)/d2/2.;
    float o = sqrt(d1*d1-p*p);
    return a + mat4x2(-p,-o,o,-p,p,o,-o,p)*vec4(a,b)/d2;
}

float scene(vec3 p) {
    //p += tex(p*2.5)*.001;
    p += sin(p).yzx*.01;
    p -= sin(p).zxy*.01;
    p += sin(p*3.).yzx*.001;
    p -= sin(p*3.).zxy*.001;
    vec2 id = round(p.xy/60.)*60.;
    p.xy -= id;
    
    float ang = sin(dot(id,vec2(5e4,3e3)))*2e3+2.;
    p=xy(p,sin(ang)*.1);
    p.xy+=fract(ang)*8.-4.;
    vec2 sprocket = vec2(3.4,4.1) - vec2(cos(ang),sin(ang))*2.1;
    vec2 bearing = poop(vec2(-1.8,10.5500), sprocket, 4.6,6.4);
    vec2 cable = mix(bearing,vec2(-1.8,10.5500),2.32);
    vec2 rel = bearing-vec2(-1.8,10.5500);
    vec2 rel2 = sprocket-bearing;
    float ang2 = atan(-rel.y,rel.x);
    float ang3 = -atan(rel2.x,rel2.y);

    //return min(walking_beam(p), ladder_all(yz(p,.1)-vec3(0.8000,1.,-6.)));
    float pumpjack = base(p);
    pumpjack = min(pumpjack, chonker(p));
    pumpjack=min(pumpjack,ladder_all(yz(p*vec3(1,-1,1),.2)-vec3(1.,4.3,4.75))); //todo: flip inside ladder_all..?
    vec3 pbeam = (p-vec3(0,vec2(-1.8,10.5500)))*vec3(1,-1,1);
    pbeam=yz(pbeam,ang2);
    pumpjack=min(pumpjack,walking_beam(pbeam));
    pumpjack=min(pumpjack,legs(p));
    // pumpjack=min(pumpjack,back_bench(p));
    pumpjack=min(pumpjack,fence(p));
    pumpjack=min(pumpjack,gearbx(p));
    vec3 epos = p-vec3(0.,bearing);
    epos = yz(epos,ang3);
    pumpjack=min(pumpjack,counterweights(p, ang));
    pumpjack=min(pumpjack,equalizer(epos));
    return min(pumpjack,wireline(p,cable.y));
    
    /*debugging for linkage positions
    pumpjack = min(pumpjack, length(p-vec3(sign(p.x)*2.,sprocket))-.2);
    pumpjack = min(pumpjack, length(p-vec3(sign(p.x)*2.,bearing))-.2);
    pumpjack = min(pumpjack, length(p-vec3(sign(p.x)*2.,vec2(-1.8,10.5500)))-.2);
    pumpjack = min(pumpjack, length(p-vec3(sign(p.x)*2.,vec2(3.4,4.1)))-.2);
    */
    // return pumpjack;
    //return ladder_all(p);
}

vec3 norm(vec3 p) {
    mat3 k = mat3(p,p,p)-mat3(0.001);
    return normalize(scene(p) - vec3(scene(k[0]), scene(k[1]), scene(k[2])));
}

//todo: replace with smaller hashfunc
float hash(float a, float b) {
    // return fract(100.*fract(sin(a) * 1e4) + fract(sin(b) * 1e4))*2.-1.;
    // return fract(sin(a*12.9898+b*4.1414) * 43758.5453)*2.-1.;
    int x = floatBitsToInt(a/7.);//^floatBitsToInt(a+.1);
    int y = floatBitsToInt(b/7.);//^floatBitsToInt(b+.1);
    return float((x*x+y)*(y*y-x)-x)/2.14e9;
}

float rnd1,rnd2,rnd3;
float blades(vec2 p) {
    p.x -= (floor(p.x/40.)+.5)*40.;
    float id = pow(floor(sqrt(abs(p.x*40.))),2.);
    id = sign(p.x)*(id+sqrt(id))/40.;
    //float id = (floor(p.x*2.)+.5)/2.;
    p.x -= id;
    //p.x = sgn*(p.x*4.-sign(p.x)*(id+sqrt(id)))/4.;

    rnd1 =fract(sin(id*777.)*1e5);
    rnd2 =fract(sin(id*999.)*1e4);
    rnd3 =fract(sin(id*555.)*1e3);
    p.x += pow(p.y,2.)*(pow(rnd2,3.)*sign(rnd1-.5))*2.;
    return bx(p,vec2(.004-p.y*.02,.5-pow(rnd3,2.)*.5))-.005;
}
vec2 blades_norm(vec2 p) {
    mat2 k = mat2(p,p)-mat2(0.0001);
    return normalize(blades(p) - vec2(blades(k[0]), blades(k[1])));
}

vec3 pixel_color( vec2 uv )
{
    //uv /=1.5;
    //uv-=vec2(-.0,.5);
    vec3 cam = normalize(vec3(1.1,uv));
    vec3 init = vec3(-25,0,1.7);
    cam=xz(cam,-.18);
    //init=xz(init,-.1);
    cam=xy(cam,.81);
    init=xy(init,.73);
    // init.y-=-1.;
    //cam = vec3(1,0,0);
    //uv.x=-uv.x;
    //init = vec3(-10,uv*15.);
    
    vec3 p = init;
    bool hit = false;
    int i;
    for (i=0; i < 150 && !hit; i++) {
        float dist = scene(p);
        hit = dist*dist < 1e-7;
        p += dist*cam;
        //cam = normalize(cam+tex(p*.05)*dist*vec3(0,0,0.00005));
        if(length(p-init)>550.)break;
    }
    float warp = cos(cam.z*10.+cam.x*5.)*.1;
    float tnear = (.25-init.z+warp) / cam.z;
    float tfar = (-init.z+warp) / cam.z;
    vec3 dir = normalize(vec3(-1,-1,1));
    vec3 n = norm(p);
    bool gnd = false;
    float atten = 1.;
    
    //float oz = 0.;
    if (tnear > 0.) {
        float bbscale = .01;
        float dx = length(cam.xy)*tnear;
        float at = atan(cam.x,cam.y);
        for (int pl = 0; pl < 150; pl++) {
            int bbid = int(ceil(dx/bbscale)) + pl;
            float bbx = float(bbid)*bbscale;
            float off =  fract(sin(bbx*668.)*500.)*500.-250.;
            float tt = (bbx-dx)/length(cam.xy);
            vec2 crds = vec2(at*bbx+off,.25+cam.z*tt);
            //t += tt;
            vec3 p2 = init+cam*(tnear+tt);
            //blheight = cos(p2.x*.5)*cos(p2.y*.5)*.5+.5;
            if (blades(crds)>tnear*.0001) continue;
            if ((tnear+tt) < length(p-init) || !hit) {
                p = p2;
                //todo: better normal calc
                //this is so hilariously silly idk why it works
                vec2 bn = blades_norm(crds);
                n = normalize(vec3(-cam.xy,(fract(rnd2*1e4)*8.-4.)*crds.y)+(bn.x+rnd2*2.-1.)*vec3(cam.y,-cam.x,0));
                atten *= crds.y/.25;
                hit = true;
                gnd = true;
                //oz=length(p.xy-init.xy);
            }
            break;
        }
        if (tfar<length(p-init) || !hit) {
            p = init+cam*tfar;
            n = vec3(0,0,1);
            hit = true;
            gnd = true;
            atten = .01;
        }
    }

    //if (!hit) return vec3(.86,1.35,2.44);
    float cloud = tex(cam*.1+cam.z)*.015;
    if (!hit) return mix(vec3(.4,1.5,2.8),vec3(4.3,5.9,6.6),pow(1.-smoothstep(-0.1,1.1,cam.z-cloud),10.));//*smoothstep(100.,400.,length(p-init));
    vec3 r = reflect(cam, n);
    vec3 h = normalize(cam-dir);
    float ao = smoothstep(-.1,.1,scene(p+n*.1))*smoothstep(-.5,.5,scene(p+n*.5))*smoothstep(-1.,1.,scene(p+n));

    // vec3 ground = vec3(.04,.05,.01);
    // vec3 sky = vec3(.04,.04,.045);
    // float fres=1.-abs(dot(cam,n))*.98;

    float sunnordt = max(0.,dot(dir,n));
    float sunnordtr = max(0.,-dot(dir,n));
    float sunrefdt = dot(n,h);//*.5+.5;
    float ggx = .05/(0.99+cos(sunrefdt*2.92));
    //float roug = step(0.,tex(p.xy*.05));
    //float ggx = mix(.05/(0.99+cos(sunrefdt*2.92)),.1/(0.96 + cos(sunrefdt*2.7)),roug);

    
    // vec3 skydiff = mix(ground,sky,n.z*.5+.5)*sqrt(ao);
    // vec3 sundiff = sunnordt*vec3(5);
    
    vec3 skyspec = mix(mix(vec3(0),vec3(.05,.05,.01),smoothstep(-1.1,-.7,n.z)),vec3(.04,.045,.045),smoothstep(-.6,.6,r.z))*sqrt(ao);
    vec3 sunspec = ggx*sqrt(sunnordt)*.3*vec3(2.2,1.8,1.5);//ggx approximation
    
    
    init = p;
    p += dir*.001;
    float minn = 1e4;
    for (int j = 0; j < 60; j++) {
        float dist = scene(p);
        minn=min(minn,dist/length(p-init));
        if (dist < 0.0001) {minn=0.; break;}
        p += dist*dir;
        if(length(p-init)>50.)break;
    }

    minn = pow(max(minn,0.),.1);
    vec3 col = (sunspec*minn+skyspec);
    
    vec3 grasscol = rnd3<.5?vec3(.52,.57,.1):vec3(0.322,0.137,0.137);
    //this grass material has no physical basis
    if (gnd) col = grasscol*mix(.01,(sunnordt*5.+sunnordtr*.5+ggx*2.)*minn+.4,atten*ao*(minn*.5+.5));//minn*vec3(.1,.2,.05);
    return col;
}

// bool logo(vec2 uv) {
//     float id = round(uv.y * 10.5);
//     vec2 uv2 = vec2(uv.x, id / 10.5);
//     if (length(uv2*vec2(1.0,0.8) + vec2(0.75, 0.0)) < 1. && length(uv2) < .9) return mod(id,2.) > .5;
//     if (length(uv)<1.&&uv.x<0.)return true;
//     return abs(length(uv) - 1.) < 0.07;
// }

void main() {
	fragCol = vec4(0);
	// if (gl_FragCoord.x>resolution.x||gl_FragCoord.y>resolution.y) { discard; return; }
	vec2 uv = (gl_FragCoord.xy-resolution*.5)/vec2(resolution.y,-resolution.y);
	float sd = hash(uv.x,uv.y);
	for (int i = 0; i < samples; i++) {
		sd = hash(sd, 2.);
		vec2 hs = tan(vec2(hash(sd, 9.), hash(sd, 5.)))/resolution.y;
        vec3 col = pixel_color(uv + hs);
        // if (logo((uv+hs*.5+resolution*.5/resolution.y-.05)*40.)) col=vec3(1);
        if (!isnan(length(col))) fragCol += vec4(col, 1); //no idea where nans are coming from
	}

	fragCol = smoothstep(-0.2,1.2,sqrt(
        fragCol/fragCol.w/4.*(1.0 - dot(uv,uv)*0.5))
    ) + sd*.015; //vignette/grade/"film grain"
    // fragCol.xyz*=mat3(1.7,-.2,-.4,-.3,1.4,-.1,-.1,-.1,1.2);
}
