import { ClassModuleAST, EnumAST } from './class-module-ast';
import { SequentialEmitter } from './class-sequential-emitter';
export declare class ClassModuleEmitter extends SequentialEmitter {
    private module_signatures;
    emit(parsed: {
        enums: EnumAST[];
        modules: ClassModuleAST[];
        consts?: readonly {
            name: string;
            value: string;
        }[];
    }): string;
    registerModuleSignature(mod: ClassModuleAST): void;
    private emitEnum;
    private emitModule;
    private emitSubmoduleInst;
}
