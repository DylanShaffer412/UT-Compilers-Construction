    /*
    ** Dylan Shaffer
    ** COSC 561
    ** cexpr
    */
%{
#include <stdio.h>
#include <limits.h>

int vars[26];   /* the 26 predefined variables a-z */
int g_error;    /* 0 = none, 1 = overflow, 2 = dividebyzero */

int yylex(void);
void yyerror(const char *s);

/* Clamps a wide result back down to int range, flagging overflow. */
static int clamp(long long r) {
    if (r > INT_MAX || r < INT_MIN) { g_error = 1; return 0; }
    return (int)r;
}

 /*
 ** Arithmetic/bitwise helpers, one per operator. Each bails out early
 ** (returning 0) if an error already happened earlier in the calculation.
 */
static int op_add(int a, int b) { if (g_error) return 0; return clamp((long long)a + b); }
static int op_sub(int a, int b) { if (g_error) return 0; return clamp((long long)a - b); }
static int op_mul(int a, int b) { if (g_error) return 0; return clamp((long long)a * b); }
static int op_shl(int a, int b) { if (g_error) return 0; return clamp((long long)a << b); }
static int op_shr(int a, int b) { if (g_error) return 0; return clamp((long long)a >> b); }
static int op_neg(int a)        { if (g_error) return 0; return clamp(-(long long)a); }
static int op_not(int a)        { if (g_error) return 0; return ~a; }
static int op_and(int a, int b) { if (g_error) return 0; return a & b; }
static int op_xor(int a, int b) { if (g_error) return 0; return a ^ b; }
static int op_or(int a, int b)  { if (g_error) return 0; return a | b; }

static int op_div(int a, int b) {
    if (g_error) return 0;
    if (b == 0) { g_error = 2; return 0; }
    if (a == INT_MIN && b == -1) { g_error = 1; return 0; }
    return a / b;
}

static int op_mod(int a, int b) {
    if (g_error) return 0;
    if (b == 0) { g_error = 2; return 0; }
    if (b == -1) return 0;
    return a % b;
}

/* Prints all 26 variables, "a" through "z". */
static void dump_vars(void) {
    int i;
    for (i = 0; i < 26; i++)
        printf("%c: %d\n", 'a' + i, vars[i]);
}

/* Resets all 26 variables back to 0. */
static void clear_vars(void) {
    int i;
    for (i = 0; i < 26; i++)
        vars[i] = 0;
}
%}

%union {
    int   ival;
    long long lval;
}

%token <lval> NUM
%token <ival> VAR
%token DUMP CLEAR
%token SHL SHR
%token PLUSEQ MINUSEQ MULEQ DIVEQ MODEQ SHLEQ SHREQ ANDEQ XOREQ OREQ

%type <ival> expr or_expr xor_expr and_expr shift_expr add_expr mul_expr unary_expr primary

%%

commands:
	/* empty */
	|	commands command
	;

command	:	mark expr ';'
		{
		  /* Print the result, or the first error hit along the way. */
		  if (g_error == 1)      printf("overflow\n");
		  else if (g_error == 2) printf("dividebyzero\n");
		  else                   printf("%d\n", $2);
		}
	|	DUMP ';'  { dump_vars(); }
	|	CLEAR ';' { clear_vars(); }
	;

/* Empty rule that fires before each expr, resetting the error flag. */
mark	:	/* empty */ { g_error = 0; }
	;

 /*
 ** Assignment sits above the rest of the operator ladder, is right
 ** associative, and only ever chains into itself or into an or_expr -
 ** never back down into a bare operator - which is how "no operator may
 ** precede an assignment" ends up enforced by the grammar itself.
 */
expr	:	VAR '='    expr { if (!g_error) vars[$1] = $3;                  $$ = $3; }
	|	VAR PLUSEQ expr { int r = op_add(vars[$1], $3); if (!g_error) vars[$1] = r; $$ = r; }
	|	VAR MINUSEQ expr { int r = op_sub(vars[$1], $3); if (!g_error) vars[$1] = r; $$ = r; }
	|	VAR MULEQ  expr { int r = op_mul(vars[$1], $3); if (!g_error) vars[$1] = r; $$ = r; }
	|	VAR DIVEQ  expr { int r = op_div(vars[$1], $3); if (!g_error) vars[$1] = r; $$ = r; }
	|	VAR MODEQ  expr { int r = op_mod(vars[$1], $3); if (!g_error) vars[$1] = r; $$ = r; }
	|	VAR SHLEQ  expr { int r = op_shl(vars[$1], $3); if (!g_error) vars[$1] = r; $$ = r; }
	|	VAR SHREQ  expr { int r = op_shr(vars[$1], $3); if (!g_error) vars[$1] = r; $$ = r; }
	|	VAR ANDEQ  expr { int r = op_and(vars[$1], $3); if (!g_error) vars[$1] = r; $$ = r; }
	|	VAR XOREQ  expr { int r = op_xor(vars[$1], $3); if (!g_error) vars[$1] = r; $$ = r; }
	|	VAR OREQ   expr { int r = op_or (vars[$1], $3); if (!g_error) vars[$1] = r; $$ = r; }
	|	or_expr         { $$ = $1; }
	;

/* Precedence ladder below, one level per nonterminal, lowest first. */

or_expr	:	or_expr '|' xor_expr { $$ = op_or($1, $3); }
	|	xor_expr             { $$ = $1; }
	;

xor_expr:	xor_expr '^' and_expr { $$ = op_xor($1, $3); }
	|	and_expr              { $$ = $1; }
	;

and_expr:	and_expr '&' shift_expr { $$ = op_and($1, $3); }
	|	shift_expr              { $$ = $1; }
	;

shift_expr:	shift_expr SHL add_expr { $$ = op_shl($1, $3); }
	|	shift_expr SHR add_expr { $$ = op_shr($1, $3); }
	|	add_expr                { $$ = $1; }
	;

add_expr:	add_expr '+' mul_expr { $$ = op_add($1, $3); }
	|	add_expr '-' mul_expr { $$ = op_sub($1, $3); }
	|	mul_expr              { $$ = $1; }
	;

mul_expr:	mul_expr '*' unary_expr { $$ = op_mul($1, $3); }
	|	mul_expr '/' unary_expr { $$ = op_div($1, $3); }
	|	mul_expr '%' unary_expr { $$ = op_mod($1, $3); }
	|	unary_expr              { $$ = $1; }
	;

/* Highest precedence: unary operators, then parens/literals/variables. */
unary_expr:	'~' unary_expr { $$ = op_not($2); }
	|	'-' unary_expr { $$ = op_neg($2); }
	|	primary        { $$ = $1; }
	;

primary	:	'(' or_expr ')' { $$ = $2; }
	|	NUM
		{
		  if ($1 > INT_MAX || $1 < INT_MIN) { g_error = 1; $$ = 0; }
		  else $$ = (int)$1;
		}
	|	VAR { $$ = vars[$1]; }
	;

%%

int main(void) {
    if (yyparse())
        printf("\nInvalid expression.\n");
    else
        printf("\nCalculator off.\n");
    return 0;
}

void yyerror(const char *s) {
    fprintf(stderr, "%s\n", s);
}
