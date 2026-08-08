tac: y.tab.c lex.yy.c
	gcc -g -o tac y.tab.c lex.yy.c -ll

y.tab.c: tac.y
	yacc -d tac.y

lex.yy.c: scan.l
	lex scan.l

clean:
	rm -f y.tab.c y.tab.h lex.yy.c tac
