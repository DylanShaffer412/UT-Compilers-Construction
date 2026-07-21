    /*
    ** Dylan Shaffer
    ** COSC 561
    ** cexpr
    */
%{
#include <stdlib.h>
#include "y.tab.h"
%}

%%

"dump"      { return DUMP; }               /* dump command */
"clear"     { return CLEAR; }               /* clear command */

[a-z]       { yylval.ival = yytext[0] - 'a'; return VAR; }

[0-9]+      { yylval.lval = strtoll(yytext, NULL, 10); return NUM; }

"<<="       { return SHLEQ; }
">>="       { return SHREQ; }
"+="        { return PLUSEQ; }
"-="        { return MINUSEQ; }
"*="        { return MULEQ; }
"/="        { return DIVEQ; }
"%="        { return MODEQ; }
"&="        { return ANDEQ; }
"^="        { return XOREQ; }
"|="        { return OREQ; }
"<<"        { return SHL; }
">>"        { return SHR; }

[-()~*/%+&^|=;]  { return yytext[0]; }      /* single-character operators */

[ \t\n]+    { /* skip whitespace */ }

.           { return yytext[0]; }           /* let the parser flag it */

%%

int yywrap(void) {
    return 1;
}
