    /*
    ** Dylan Shaffer
    ** COSC 561
    */

%{
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int yylex(void);
void yyerror(const char *s);

/* Counts temps, reset before each expr so numbering restarts at t1 */
static int tempCount;

/* Set when the top-level expr was an assignment, so command knows
** whether it still needs to print */
static int g_is_assign;

/* Returns a new "tN" temp name */
static char *new_temp(void) {
    char buf[16];
    snprintf(buf, sizeof buf, "t%d", ++tempCount);
    return strdup(buf);
}

/* Emits temp = a op b, frees the operands, returns the new temp */
static char *emit_binop(char *a, const char *op, char *b) {
    char *t = new_temp();
    printf("%s = %s %s %s\n", t, a, op, b);
    free(a);
    free(b);
    return t;
}

/* Emits temp = opa (no space before the operand), frees a, returns the temp */
static char *emit_unop(const char *op, char *a) {
    char *t = new_temp();
    printf("%s = %s%s\n", t, op, a);
    free(a);
    return t;
}
%}

%union {
    char *loc;
}

%token <loc> NUM VAR
%token SHL SHR
%token PLUSEQ MINUSEQ MULEQ DIVEQ MODEQ SHLEQ SHREQ ANDEQ XOREQ OREQ

%type <loc> expr or_expr xor_expr and_expr shift_expr add_expr mul_expr neg_expr not_expr primary

%%

commands:
	/* empty */
	|	commands command
	;

/* Empty rule that fires before each expr, resetting the temp counter
** and the assignment flag */
mark	:	/* empty */ { tempCount = 0; g_is_assign = 0; }
	;

command	:	mark expr ';'
		{
		  if (!g_is_assign) printf("result = %s\n", $2);
		  printf("\n");
		  free($2);
		}
	;

expr	:	VAR '=' expr
		{
		  printf("%s = %s\n", $1, $3);
		  free($1);
		  $$ = $3;
		  g_is_assign = 1;
		}
	|	VAR PLUSEQ expr
		{
		  char *t = emit_binop(strdup($1), "+", $3);
		  printf("%s = %s\n", $1, t);
		  free($1);
		  $$ = t;
		  g_is_assign = 1;
		}
	|	VAR MINUSEQ expr
		{
		  char *t = emit_binop(strdup($1), "-", $3);
		  printf("%s = %s\n", $1, t);
		  free($1);
		  $$ = t;
		  g_is_assign = 1;
		}
	|	VAR MULEQ expr
		{
		  char *t = emit_binop(strdup($1), "*", $3);
		  printf("%s = %s\n", $1, t);
		  free($1);
		  $$ = t;
		  g_is_assign = 1;
		}
	|	VAR DIVEQ expr
		{
		  char *t = emit_binop(strdup($1), "/", $3);
		  printf("%s = %s\n", $1, t);
		  free($1);
		  $$ = t;
		  g_is_assign = 1;
		}
	|	VAR MODEQ expr
		{
		  char *t = emit_binop(strdup($1), "%", $3);
		  printf("%s = %s\n", $1, t);
		  free($1);
		  $$ = t;
		  g_is_assign = 1;
		}
	|	VAR SHLEQ expr
		{
		  char *t = emit_binop(strdup($1), "<<", $3);
		  printf("%s = %s\n", $1, t);
		  free($1);
		  $$ = t;
		  g_is_assign = 1;
		}
	|	VAR SHREQ expr
		{
		  char *t = emit_binop(strdup($1), ">>", $3);
		  printf("%s = %s\n", $1, t);
		  free($1);
		  $$ = t;
		  g_is_assign = 1;
		}
	|	VAR ANDEQ expr
		{
		  char *t = emit_binop(strdup($1), "&", $3);
		  printf("%s = %s\n", $1, t);
		  free($1);
		  $$ = t;
		  g_is_assign = 1;
		}
	|	VAR XOREQ expr
		{
		  char *t = emit_binop(strdup($1), "^", $3);
		  printf("%s = %s\n", $1, t);
		  free($1);
		  $$ = t;
		  g_is_assign = 1;
		}
	|	VAR OREQ expr
		{
		  char *t = emit_binop(strdup($1), "|", $3);
		  printf("%s = %s\n", $1, t);
		  free($1);
		  $$ = t;
		  g_is_assign = 1;
		}
	|	or_expr { $$ = $1; }
	;

/* Precedence ladder below, one level per nonterminal, lowest first */

or_expr	:	or_expr '|' xor_expr { $$ = emit_binop($1, "|", $3); }
	|	xor_expr             { $$ = $1; }
	;

xor_expr:	xor_expr '^' and_expr { $$ = emit_binop($1, "^", $3); }
	|	and_expr              { $$ = $1; }
	;

and_expr:	and_expr '&' shift_expr { $$ = emit_binop($1, "&", $3); }
	|	shift_expr              { $$ = $1; }
	;

shift_expr:	shift_expr SHL add_expr { $$ = emit_binop($1, "<<", $3); }
	|	shift_expr SHR add_expr { $$ = emit_binop($1, ">>", $3); }
	|	add_expr                { $$ = $1; }
	;

add_expr:	add_expr '+' mul_expr { $$ = emit_binop($1, "+", $3); }
	|	add_expr '-' mul_expr { $$ = emit_binop($1, "-", $3); }
	|	mul_expr              { $$ = $1; }
	;

mul_expr:	mul_expr '*' neg_expr { $$ = emit_binop($1, "*", $3); }
	|	mul_expr '/' neg_expr { $$ = emit_binop($1, "/", $3); }
	|	mul_expr '%' neg_expr { $$ = emit_binop($1, "%", $3); }
	|	neg_expr              { $$ = $1; }
	;

neg_expr:	'-' neg_expr { $$ = emit_unop("-", $2); }
	|	not_expr       { $$ = $1; }
	;

not_expr:	'~' not_expr { $$ = emit_unop("~", $2); }
	|	primary        { $$ = $1; }
	;

primary	:	'(' or_expr ')' { $$ = $2; }
	|	NUM             { $$ = $1; }
	|	VAR             { $$ = $1; }
	;

%%

int main(void) {
    if (yyparse())
        printf("\nInvalid expression.\n");
    else
        printf("Three-address code generation complete.\n");
    return 0;
}

void yyerror(const char *s) {
    fprintf(stderr, "%s\n", s);
}
