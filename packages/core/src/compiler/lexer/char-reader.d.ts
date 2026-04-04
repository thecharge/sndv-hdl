export declare class CharReader {
    protected readonly source: string;
    protected position: number;
    protected line: number;
    protected column: number;
    constructor(source: string);
    protected peek(): string;
    protected advance(): string;
    protected match(expected: string): boolean;
    protected isAtEnd(): boolean;
    protected isDigit(char: string): boolean;
    protected isHexDigit(char: string): boolean;
    protected isBinaryDigit(char: string): boolean;
    protected isIdentifierStart(char: string): boolean;
    protected isIdentifierPart(char: string): boolean;
    protected skipWhitespaceAndComments(): void;
    private skipLineComment;
    private skipBlockComment;
}
