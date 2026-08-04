    /*
    ** Dylan Shaffer
    ** COSC 561
    ** HTML to LaTeX Converter
    */
%{
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

int list_type;
%}

%option       noyywrap nounput yylineno
%x            COMMENT PARA PRE OL UL LI

%%

"<h1>"[^<]*"</h1>" {
    /**************************************************************************
     * Matched an HTML H1 header so print it out as a LateX section title.
     * The beginning and ending tags need to be stripped off before the
     * title can be formatted in LateX.
     *************************************************************************/
    yytext[yyleng-5] = 0;
    printf( "\\section{%s}", yytext+4 );
}

"<h2>"[^<]*"</h2>" {
    /**************************************************************************
     * Matched an HTML H2 header to print it out as a LateX subsection title.
     * Stripped off beginning and ending tags before formatting.
     *************************************************************************/
    yytext[yyleng-5] = 0;
    printf( "\\subsection{%s}", yytext+4 );
}

"<h3>"[^<]*"</h3>" {
    /**************************************************************************
     * Matched an HTML H3 header to print it out as a LateX subsubsection title.
     * Stripped off beginning and ending tags before formatting.
     *************************************************************************/
    yytext[yyleng-5] = 0;
    printf( "\\subsubsection{%s}", yytext+4 );
}

 /*
 ** Matched an HTML preformatted text block to print it out as a LateX verbatim block.
 ** Begin "pre" block
 */
"<pre>" {
    printf( "\\begin{verbatim}\n" );
    BEGIN PRE;
}

<PRE>"</pre>" {
    printf( "\n\\end{verbatim}" );
    BEGIN 0;
}

<PRE>(.|\n) {
    // Catches any character or newline
    printf( "%s", yytext );
}
 /* End pre block */

 /*
 ** Matched an HTML paragraph to print it out as a LateX paragraph block.
 ** Begin paragraph block
 */
"<p>" {
    BEGIN PARA;
}

<PARA>"</p>" {
    printf( "\n\n" );   // Handles the visual paragraph break
    BEGIN 0;
}
 /* End paragraph block */

 /*
 ** Matched an HTML list item to print it out as a LateX list block.
 ** Begin list block
 */
"<ol>" {
    printf( "\\begin{enumerate}\n" );
    BEGIN OL;
}

"<ul>" {
    printf( "\\begin{itemize}\n" );
    BEGIN UL;
}

<OL>"<li>" {
    printf( "\\item " );
    list_type = OL;
    BEGIN LI;
}

<UL>"<li>" {
    printf( "\\item " );
    list_type = UL;
    BEGIN LI;
}

<LI>"</li>" {
    printf( "\n" );
    BEGIN list_type;
}

<OL>"</ol>" {
    printf( "\\end{enumerate}\n" );
    BEGIN 0;
}

<UL>"</ul>" {
    printf( "\\end{itemize}\n" );
    BEGIN 0;
}

<OL,UL>[ \t\n\r]+ {
    /* Ignore whitespace between <li> items */
}
 /* End list block */

 <PARA,LI>"<small>"[^<]*"</small>" {
    /**************************************************************************
     * Matched an HTML small text block to print it out as a LateX small
     * text block. Stripped off beginning and ending tags before formatting.
     *************************************************************************/
    yytext[yyleng-8] = 0;
    printf( "{\\scriptsize %s}", yytext+7 );
}

<PARA,LI>"<big>"[^<]*"</big>" {
    /**************************************************************************
     * Matched an HTML large text block to print it out as a LateX large
     * text block. Stripped off beginning and ending tags before formatting.
     *************************************************************************/
    yytext[yyleng-6] = 0;
    printf( "{\\Large %s}", yytext+5 );
}

<PARA,LI>"<b>"[^<]*"</b>" {
    /**************************************************************************
     * Matched an HTML bold text block to print it out as a LateX bold
     * text block. Stripped off beginning and ending tags before formatting.
     *************************************************************************/
    yytext[yyleng-4] = 0;
    printf( "{\\textbf{%s}}", yytext+3 );
}

<PARA,LI>"<i>"[^<]*"</i>" {
    /**************************************************************************
     * Matched an HTML italic text block to print it out as a LateX italic
     * text block. Stripped off beginning and ending tags before formatting.
     *************************************************************************/
    yytext[yyleng-4] = 0;
    printf( "{\\textit{%s}}", yytext+3 );
}

<PARA,LI>"<strong>"[^<]*"</strong>" {
    /**************************************************************************
     * Matched an HTML strong text block to print it out as a LateX textmd
     * text block. Stripped off beginning and ending tags before formatting.
     *************************************************************************/
    yytext[yyleng-9] = 0;
    printf( "{\\textmd{%s}}", yytext+8 );
}

<PARA,LI>"<em>"[^<]*"</em>" {
    /**************************************************************************
     * Matched an HTML emphasized text block to print it out as a LateX emph
     * text block. Stripped off beginning and ending tags before formatting.
     *************************************************************************/
    yytext[yyleng-5] = 0;
    printf( "{\\emph{%s}}", yytext+4 );
}

<PARA,LI>"<sup>"[^<]*"</sup>" {
    /**************************************************************************
     * Matched an HTML superscript text block to print it out as a LateX
     * superscript text block. Stripped off beginning and ending tags before
     * formatting.
     *************************************************************************/
    yytext[yyleng-6] = 0;
    printf( "{\\textsuperscript{%s}}", yytext+5 );
}

<PARA,LI>"<sub>"[^<]*"</sub>" {
    /**************************************************************************
     * Matched an HTML subscript text block to print it out as a LateX
     * subscript text block. Stripped off beginning and ending tags before
     * formatting.
     *************************************************************************/
    yytext[yyleng-6] = 0;
    printf( "{\\textsubscript{%s}}", yytext+5 );
}

"<!--" {
    /**************************************************************************
     * Matched an HTML comment so print it out as a LateX comment. The
     * beginning and ending tags are stripped off before the LateX comment
     * is emitted.
     *************************************************************************/
    printf( "%% " );
    BEGIN COMMENT;
}

[ \t\n\r]+ {
    /**************************************************************************
     * Matched some whitespace that is not inside of an HTML tag. We
     * just ignore the whitespace.
     *************************************************************************/
}

. {
    /**************************************************************************
     * Matched something that we did not expect to see. Issue an error and
     * exit the program with a failure code.
     *************************************************************************/
    fprintf( stderr, "Unexpected input at line %d: '%s'\n", yylineno, yytext );
    exit( 1 );
}

<COMMENT>"-->" {
    /**************************************************************************
     * Matched an HTML end comment while parsing an HTML comment. Print out
     * a new line and resume normal parsing.
     *************************************************************************/
    printf( "\n" );
    BEGIN 0;
}

<COMMENT>[\n](\r)? {
    /**************************************************************************
     * Matched a newline while parsing an HTML comment. Print out a new
     * line making sure to mark the next line as a comment as well.
     *************************************************************************/
    printf( "\n%% " );
}

<COMMENT>[ \t] {
    /**************************************************************************
     * Matched some white space while parsing an HTML comment. Print out
     * the white space as is.
     *************************************************************************/
    printf( "%s", yytext );
}

<COMMENT>. {
    /**************************************************************************
     * Matched any other text while parsing an HTML comment. Print out
     * the text as is.
     *************************************************************************/
    printf( "%s", yytext );
}

<PARA,LI>[^<]+ {
    /**************************************************************************
     * General rule to match tags within the paragraph and list item blocks.
     * Print out the text as is.
     *************************************************************************/
    printf( "%s", yytext );
}

%%

/**************************************************************************
 * The main function for the HTML to LateX converter. Here we do three
 * things:
 *  1. Print out the LateX document header.
 *  2. Invoke the lexer to print out the LateX document
 *  3. Print out the LateX footer.
 *************************************************************************/
int main( int argc, const char *argv[] ) {
    printf( "\\documentclass[12pt]{article}\n" );
    printf( "\\usepackage{fixltx2e}\n" );
    printf( "\n" );
    printf( "\\setlength{\\parindent}{0.0in}\n" );
    printf( "\\setlength{\\parskip}{0.125in}\n" );
    printf( "\n\n" );
    printf( "\\begin{document}\n" );
    yylex();
    printf( "\\end{document}\n" );
    return 0;
}
