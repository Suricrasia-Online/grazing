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

#include <glib.h>
#include <gtk/gtk.h>
#include <gdk/gdkkeysyms.h>
#include <GL/gl.h>
#include <GL/glx.h>
#include <GL/glu.h>
#include <GL/glext.h>
// #include <EGL/egl.h>

#include "sys.h"

#include "shader.h"
const char* vshader = "#version 420\nout gl_PerVertex{vec4 gl_Position;};void main(){gl_Position=vec4(gl_VertexID%2*2-1,gl_VertexID/2*.1-1,1,1);}";
// const char* vshader = "#version 420\nout gl_PerVertex{vec4 gl_Position;};void main(){gl_Position=vec4(sin(gl_VertexID*2)*4,cos(gl_VertexID*2)*4,1,1);}";

#define CHAR_BUFFER_SIZE 16384

#define DEBUG_FRAG
#define DEBUG_VERT
#define EXIT_USING_ESC_KEY
#define TIME_RENDER
#define BLACK_BACKGROUND

uint8_t* data;
GtkWidget* image;
int width = 1920;
int height = 1080;

#ifdef TIME_RENDER
GTimer* gtimer;
#endif

#ifdef EXIT_USING_ESC_KEY
static gboolean check_escape(GtkWidget *widget, GdkEventKey *event)
{
	(void)widget;
	if (event->keyval == GDK_KEY_Escape) {
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
	(void)user_data;
	int status;
	pid_t result = waitpid(-1, &status, WNOHANG);
	if (result != 0) {
		if (*data != 1) {
			SYS_exit_group(0);
			__builtin_unreachable();
		}
		GdkPixbuf* pxbuf = gdk_pixbuf_new_from_data(data+1, GDK_COLORSPACE_RGB, false, 8, width, height, 3*width, NULL, NULL);
		gtk_image_set_from_pixbuf(GTK_IMAGE(image), pxbuf);
#ifdef TIME_RENDER
	  printf("render time: %f\n", g_timer_elapsed(gtimer, NULL));
#endif
		return G_SOURCE_REMOVE;
	}

  return G_SOURCE_CONTINUE; /* or G_SOURCE_REMOVE when you want to stop */
}

__attribute__((__externally_visible__, __section__(".text.startup._start"), __noreturn__))
void _start() {
	asm volatile("push %rax\n");


	char* resolution = getenv("RESOLUTION");
	if (resolution != NULL) {
		sscanf(resolution, "%dx%d", &width, &height);
	}

	data = mmap(NULL, width*height*3+1, PROT_READ | PROT_WRITE, MAP_SHARED | MAP_ANONYMOUS, -1, 0);

	int pid = fork();
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

		char* samples = getenv("SAMPLES");
		if (samples == NULL) samples = "150";
		char buffer [CHAR_BUFFER_SIZE];
		sprintf(buffer, "#version 420\n#define SA %s\n#define RS vec2(%d,%d)\n%s\n", samples, width, height, shader_frag);
		const char* mybuf = buffer;

		//todo: amdgpu doesn't like this at all
		// const char* shader_frag_list[] = {buffer, shader_frag};
	// 	GLuint f = glCreateShaderProgramv(GL_FRAGMENT_SHADER, 1, &mybuf);
	// 	GLuint v = glCreateShaderProgramv(GL_VERTEX_SHADER, 1, &vshader);

	// 	GLuint p;
	// 	glGenProgramPipelines(1, &p);
	// 	glUseProgramStages(p, GL_VERTEX_SHADER_BIT, v);
	// 	glUseProgramStages(p, GL_FRAGMENT_SHADER_BIT, f);
	// 	glBindProgramPipeline(p);

	// #if defined(DEBUG_FRAG) || defined(DEBUG_VERT)
	// 	// char charbuf[CHAR_BUFFER_SIZE];
	// 	if ((p = glGetError()) != GL_NO_ERROR) { //use p to hold the error, lmao
	// #ifdef DEBUG_FRAG
	// 		glGetProgramInfoLog(f, CHAR_BUFFER_SIZE, NULL, buffer);
	// 		printf(buffer);
	// #endif
	// #ifdef DEBUG_VERT
	// 		glGetProgramInfoLog(v, CHAR_BUFFER_SIZE, NULL, buffer);
	// 		printf(buffer);
	// #endif
	// 		goto quit_asm;
	// 		// SYS_exit_group(p);
	// 		__builtin_unreachable();
	// 	}
	// #endif
	// 	GE_RET(vert, context, glCreateShader(GL_VERTEX_SHADER));
		GLint compile_status = 0;

		GLuint vert = context->glCreateShader(GL_VERTEX_SHADER);
		context->glShaderSource(vert, 1, &vshader, NULL);
		context->glCompileShader(vert);
#ifdef DEBUG_VERT
		context->glGetShaderiv(vert, GL_COMPILE_STATUS, &compile_status);
		if(compile_status == GL_FALSE) {
			context->glGetShaderInfoLog(vert, CHAR_BUFFER_SIZE, NULL, buffer);
			printf(buffer);

			goto quit_asm;
		}
#endif

		GLuint frag = context->glCreateShader(GL_FRAGMENT_SHADER);
		context->glShaderSource(frag, 1, &mybuf, NULL);
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
		// context->glVertexAttrib1f(0, 0);
		// context->glUniform1i(0, 0);


		GLuint vao;
		context->glGenVertexArrays(1, &vao);
		context->glBindVertexArray(vao);

	  for (int i = 0; i < 40; i += 2) {
			context->glDrawArrays(GL_TRIANGLE_STRIP, i, 4);
			context->glFinish();
		}

		// glReadBuffer(GL_COLOR_ATTACHMENT0);
		context->glReadPixels(0, 0, width, height, GL_RGB, GL_UNSIGNED_BYTE, data+1);
		*data=1;
	}
	else
	{
		typedef void (*voidWithOneParam)(int*);
#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wcast-function-type"
		voidWithOneParam gtk_init_one_param = (voidWithOneParam)gtk_init;
#pragma GCC diagnostic pop
		(*gtk_init_one_param)(NULL);

#ifdef TIME_RENDER
		gtimer = g_timer_new();
#endif
		GtkWidget *win = gtk_window_new (GTK_WINDOW_TOPLEVEL);

#ifdef BLACK_BACKGROUND
		GdkRGBA black = {0,0,0,0};
#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wdeprecated-declarations"
		gtk_widget_override_background_color(win, GTK_STATE_FLAG_NORMAL, &black);
#pragma GCC diagnostic pop
#endif

		g_signal_connect(win, "destroy", &&quit_asm, NULL);
#ifdef EXIT_USING_ESC_KEY
		g_signal_connect(win, "key_press_event", G_CALLBACK(check_escape), NULL);
#endif
		g_timeout_add (10, on_timeout, NULL);
		image = gtk_image_new();
		// g_signal_connect(glarea, "render", G_CALLBACK(on_render), NULL);
		gtk_container_add(GTK_CONTAINER(win), image);


		char* windowed = getenv("WINDOWED");

		GdkGeometry hints;
		hints.base_height = height;
		hints.min_height = height;
		hints.max_height = height;
		hints.base_width = width;
		hints.min_width = width;
		hints.max_width = width;
		gtk_window_set_geometry_hints ((GtkWindow*)win, NULL, &hints, GDK_HINT_MIN_SIZE | GDK_HINT_BASE_SIZE | GDK_HINT_MAX_SIZE);
		gtk_widget_show_all (win);
		if (!windowed) gtk_window_fullscreen((GtkWindow*)win);
		GdkWindow* window = gtk_widget_get_window(win);
#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wdeprecated-declarations"
		GdkCursor* Cursor = gdk_cursor_new(GDK_BLANK_CURSOR);
#pragma GCC diagnostic pop
		gdk_window_set_cursor(window, Cursor);

		gtk_main();
	}
	// write(1, data, width*height*3);

quit_asm:
	SYS_exit_group(0);
	__builtin_unreachable();
}