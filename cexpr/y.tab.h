/* A Bison parser, made by GNU Bison 2.3.  */

/* Skeleton interface for Bison's Yacc-like parsers in C

   Copyright (C) 1984, 1989, 1990, 2000, 2001, 2002, 2003, 2004, 2005, 2006
   Free Software Foundation, Inc.

   This program is free software; you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation; either version 2, or (at your option)
   any later version.

   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with this program; if not, write to the Free Software
   Foundation, Inc., 51 Franklin Street, Fifth Floor,
   Boston, MA 02110-1301, USA.  */

/* As a special exception, you may create a larger work that contains
   part or all of the Bison parser skeleton and distribute that work
   under terms of your choice, so long as that work isn't itself a
   parser generator using the skeleton or a modified version thereof
   as a parser skeleton.  Alternatively, if you modify or redistribute
   the parser skeleton itself, you may (at your option) remove this
   special exception, which will cause the skeleton and the resulting
   Bison output files to be licensed under the GNU General Public
   License without this special exception.

   This special exception was added by the Free Software Foundation in
   version 2.2 of Bison.  */

/* Tokens.  */
#ifndef YYTOKENTYPE
# define YYTOKENTYPE
   /* Put the tokens into the symbol table, so that GDB and other debuggers
      know about them.  */
   enum yytokentype {
     NUM = 258,
     VAR = 259,
     DUMP = 260,
     CLEAR = 261,
     SHL = 262,
     SHR = 263,
     PLUSEQ = 264,
     MINUSEQ = 265,
     MULEQ = 266,
     DIVEQ = 267,
     MODEQ = 268,
     SHLEQ = 269,
     SHREQ = 270,
     ANDEQ = 271,
     XOREQ = 272,
     OREQ = 273
   };
#endif
/* Tokens.  */
#define NUM 258
#define VAR 259
#define DUMP 260
#define CLEAR 261
#define SHL 262
#define SHR 263
#define PLUSEQ 264
#define MINUSEQ 265
#define MULEQ 266
#define DIVEQ 267
#define MODEQ 268
#define SHLEQ 269
#define SHREQ 270
#define ANDEQ 271
#define XOREQ 272
#define OREQ 273




#if ! defined YYSTYPE && ! defined YYSTYPE_IS_DECLARED
typedef union YYSTYPE
#line 66 "cexpr.y"
{
    int   ival;
    long long lval;
}
/* Line 1529 of yacc.c.  */
#line 90 "y.tab.h"
	YYSTYPE;
# define yystype YYSTYPE /* obsolescent; will be withdrawn */
# define YYSTYPE_IS_DECLARED 1
# define YYSTYPE_IS_TRIVIAL 1
#endif

extern YYSTYPE yylval;

