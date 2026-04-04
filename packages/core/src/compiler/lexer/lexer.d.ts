import { Token } from './token';
import { CharReader } from './char-reader';
export declare class Lexer extends CharReader {
    constructor(source: string);
    /**
     * Tokenize the entire source into a token array.
     * @returns Array of tokens ending with EndOfFile.
     * @example
     *   const tokens = new Lexer('const x: number = 5;').tokenize();
     */
    tokenize(): Token[];
    private nextToken;
    private readNumber;
    private readHexLiteral;
    private readBinaryLiteral;
    private readIdentifierOrKeyword;
    private readString;
    private readOperatorOrPunctuation;
    private makeToken;
}
