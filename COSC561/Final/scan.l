    /*
    ** Dylan Shaffer
    ** COSC 561
    */

%{
#include <stdlib.h>
#include <string.h>
#include "y.tab.h"
%}

%%

[a-z]       { yylval.loc = strdup(yytext); return VAR; }

[0-9]+      { yylval.loc = strdup(yytext); return NUM; }

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
