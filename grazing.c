#define GL_GLEXT_PROTOTYPES
#define COGL_COMPILATION 1
// #define COGL_ENABLE_EXPERIMENTAL_API
#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wsign-compare"
#include "config.h"
#include <cogl/cogl-context.h>
#include <cogl/deprecated/cogl-framebuffer-deprecated.h>
#include <cogl/cogl-context-private.h>
#pragma GCC diagnostic pop


#include<stdio.h>
#include<stdbool.h>
#include<stdlib.h>
#include<stdint.h>
#include <sys/prctl.h>
#include <sys/mman.h>

#define __COGL_H__
#include <clutter/clutter.h>

#include <GL/gl.h>
#include <GL/glx.h>
#include <GL/glu.h>
#include <GL/glext.h>
// #include <EGL/egl.h>

#include "sys.h"

#include "shader.h"
const char* vshader = "#version 420\nout gl_PerVertex{vec4 gl_Position;};void main(){gl_Position=vec4(gl_VertexID%2*2-1,gl_VertexID/2*.02-1,1,1);}";
// const char* vshader = "#version 420\nout gl_PerVertex{vec4 gl_Position;};void main(){gl_Position=vec4(sin(gl_VertexID*2)*4,cos(gl_VertexID*2)*4,1,1);}";

#define CHAR_BUFFER_SIZE 16384

#define DEBUG_FRAG
#define DEBUG_VERT
#define EXIT_USING_ESC_KEY
#define TIME_RENDER
#define BLACK_BACKGROUND

uint8_t* data;
int width = 1920;
int height = 1080;
int samples = 150;

#ifdef TIME_RENDER
GTimer* gtimer;
#endif

#ifdef EXIT_USING_ESC_KEY
static gboolean check_escape(ClutterActor *actor, ClutterKeyEvent *event)
{
	(void)actor;
	if (event->keyval == CLUTTER_KEY_Escape) {
		// goto quit_asm;
		SYS_exit_group(0);
		__builtin_unreachable();
	}

	return FALSE;
}
#endif

static gboolean
on_timeout (gpointer user_data)
{
	siginfo_t infop;
	waitid(P_ALL, 0, &infop, WNOHANG | WEXITED);
	if (infop.si_signo == SIGCHLD) {
		if (infop.si_status != 1) {
			SYS_exit_group(0);
			__builtin_unreachable();
		}
		ClutterActor *stage = (ClutterActor *)(user_data);
		ClutterContent *image = clutter_image_new();
		clutter_image_set_data((ClutterImage *)(image), data, COGL_PIXEL_FORMAT_RGB_888, width, height, width*3, NULL);

		clutter_actor_set_content(stage, image);
#ifdef TIME_RENDER
		printf("time: %f\n", g_timer_elapsed(gtimer, NULL));
#endif
		return G_SOURCE_REMOVE;
	}
	return G_SOURCE_CONTINUE;
}
// static gboolean
// expose_event(GtkWidget *widget, GdkEventExpose *event) {

// 	printf("draw!\n");
// 	return FALSE;
// }

__attribute__((__externally_visible__, __section__(".text.startup._start"), __noreturn__))
void _start() {
	asm volatile("push %rax\n");


	char* resolution = getenv("RESOLUTION");
	if (resolution != NULL) {
		sscanf(resolution, "%dx%d", &width, &height);
	}
	char* samples_var = getenv("SAMPLES");
	if (samples_var != NULL) {
		sscanf(samples_var, "%d", &samples);
	}
	int ret = 0;

	data = mmap(NULL, width*height*3, PROT_READ | PROT_WRITE, MAP_SHARED | MAP_ANONYMOUS, -1, 0);
	// signal(SIGCHLD, on_child);

	int pid = SYS_fork();
	if (pid == 0) {
		prctl(PR_SET_PDEATHSIG, SIGHUP);

		//extremely nasty
		CoglError* error = NULL;
		CoglContext* context = cogl_context_new(NULL, &error);
		(void)context;

		GLuint frameBuffer;
		context->glGenFramebuffers(1, &frameBuffer);
		context->glBindFramebuffer(GL_FRAMEBUFFER, frameBuffer);

		GLuint t;
		context->glGenTextures(1, &t);

		context->glBindTexture(GL_TEXTURE_2D, t);
		context->glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA, width, height, 0, GL_RGBA, GL_UNSIGNED_BYTE, NULL);

		context->glFramebufferTexture2D(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_TEXTURE_2D, t, 0);
		context->glViewport(0, 0, width, height);

		// sprintf(buffer, "#version 420\n#define RS vec2(%d,%d)\n%s\n", width, height, shader_frag);
		// const char* mybuf = buffer;

		GLint compile_status = 0;

		char buffer [CHAR_BUFFER_SIZE];
		GLuint vert = context->glCreateShader(GL_VERTEX_SHADER);
		context->glShaderSource(vert, 1, &vshader, NULL);
		context->glCompileShader(vert);
#ifdef DEBUG_VERT
		context->glGetShaderiv(vert, GL_COMPILE_STATUS, &compile_status);
		if(compile_status == GL_FALSE) {
			context->glGetShaderInfoLog(vert, CHAR_BUFFER_SIZE, NULL, buffer);

			goto quit_asm;
		}
#endif

		GLuint frag = context->glCreateShader(GL_FRAGMENT_SHADER);
		context->glShaderSource(frag, 1, &shader_frag, NULL);
		context->glCompileShader(frag);
#ifdef DEBUG_FRAG
		context->glGetShaderiv(frag, GL_COMPILE_STATUS, &compile_status);
		if(compile_status == GL_FALSE) {
			context->glGetShaderInfoLog(frag, CHAR_BUFFER_SIZE, NULL, buffer);
			printf(buffer);

			goto quit_asm;
		}
#endif

		GLuint p = context->glCreateProgram();
		context->glAttachShader(p, vert);
		context->glAttachShader(p, frag);
		context->glLinkProgram(p);
		// context->glGetProgramiv(p, GL_LINK_STATUS, &compile_status);
		// printf("%d\n", compile_status);
		context->glUseProgram(p);
		context->glUniform1i(context->glGetUniformLocation(p,VAR_SAMPLES), samples);
		context->glUniform2f(context->glGetUniformLocation(p,VAR_RESOLUTION), width, height);

		//turns out this is done in cogl_context_new for us!
		// GLuint vao;
		// context->glGenVertexArrays(1, &vao);
		// context->glBindVertexArray(vao);

	  for (int i = 0; i < 200; i += 2) {
			context->glDrawArrays(GL_TRIANGLE_STRIP, i, 4);
			context->glFinish();
		}

		// glReadBuffer(GL_COLOR_ATTACHMENT0);
		context->glPixelStorei(GL_PACK_ALIGNMENT, 1);
		context->glReadPixels(0, 0, width, height, GL_RGB, GL_UNSIGNED_BYTE, data);
		ret=1;
	}
	else
	{
#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wcast-function-type"
		typedef void (*voidWithOneParam)(int*);
		voidWithOneParam clutter_init_one_param = (voidWithOneParam)clutter_init;
		(*clutter_init_one_param)(NULL);
#pragma GCC diagnostic pop

		ClutterActor *stage = clutter_stage_new();
#ifdef BLACK_BACKGROUND
		ClutterColor black = {};
		clutter_actor_set_background_color(stage, &black);
#endif
		// clutter_actor_set_content(stage, image);
		// ClutterEffect *shader = clutter_shader_effect_new(CLUTTER_FRAGMENT_SHADER);
		// ClutterTimeline *timeline = clutter_timeline_new(48000-OFFSET_MS);
		g_signal_connect(stage, "delete-event", &&quit_asm, NULL);
#ifdef EXIT_USING_ESC_KEY
		g_signal_connect(stage, "key-press-event", (GCallback)check_escape, NULL);
#endif
		g_timeout_add (10, on_timeout, stage);

#ifdef TIME_RENDER
		gtimer = g_timer_new();
#endif

		char* windowed = getenv("WINDOWED");
		if (windowed) {
			clutter_actor_set_size(stage, width, height);
		}
		clutter_actor_show(stage);
		if (!windowed) {
			clutter_stage_set_user_resizable((ClutterStage *)(stage), TRUE);
			clutter_stage_set_fullscreen((ClutterStage *)(stage), TRUE);
			clutter_stage_hide_cursor((ClutterStage *)(stage));
		}

		clutter_main();
	}
	// write(1, data, width*height*3);

quit_asm:
	SYS_exit_group(ret);
	__builtin_unreachable();
}