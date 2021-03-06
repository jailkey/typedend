/*
import { Model } from '../model/model.protoytpe';
import { ModelManager } from './controller.model.manager';
import { ControllerManager } from './controller.manager';
import { CommandManager } from '../command/command.manager';
import { CommandHelper, CommandChain, CommandType } from '../command/command.helper';
import { MetaManager } from '../meta/meta.manager';
import { CommandData } from '../command/command.data';

//configurates a Controller
export function ControllerOptions(config : any){
    return config;
}


//controller superclass
export class Controller {

    constructor() {
        MetaManager.execute(this);
        this.__name = this.constructor.name;
    }

    public models : ModelManager = new ModelManager(this);

    public controller : ControllerManager = new ControllerManager(this);

    public commands : CommandManager =  new CommandManager();

    public namespace : string;

    public __name : string;

    /**
     * finds a controller command by a command chain
     * @param commandChain 
     */
    /*
    public findCommand(commandChain : CommandChain) : CommandData | null{
        
        if(commandChain.type === CommandType.namespace){
            let foundedModel = this.models.getByName(commandChain.name);
            if(foundedModel){
                if(commandChain.child.type === CommandType.method){
                    return foundedModel.__commands.getByName(commandChain.child.name);
                }else{
                    throw new Error('It is not possible to nest Models. (' + commandChain.child.name + ')' )
                }
            }
            let foundedController = this.controller.find((controller) => controller.namespace === commandChain.name);
            if(!foundedController) {
                throw new Error('There is no registerd controller with namespace "' + commandChain.name + '"!');
            }

            if(commandChain.child.type === CommandType.method){
                return foundedController.commands.getByName(commandChain.child.name);
            }else if(commandChain.child.type === CommandType.namespace){
                return foundedController.findCommand(commandChain.child);
            }
        }else if(commandChain.type === CommandType.method){
            return this.commands.getByName(commandChain.name);
        }
        
    }
}*/