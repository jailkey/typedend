import { PresentationTree } from './presentation.tree';
import { MetaManager } from '../meta/meta.manager';
import { MetaDataTypes, MetaData } from '../meta/meta.data';
import { ValidationMessage, ValidationMessageStates } from '../validation/validation.message';
import { Validator } from '../validation/validator';
import { Storage } from '../storage/storage';
import { PropertyValidationMessageList, ValidationResult } from './model.validation.interfaces';
import { ModelValidationError } from './model.validation.error';
import { ResourceAccessKey } from '../storage/storage';
import { CommandManager } from '../command/command.manager';

export interface ModelPropertyDataOptions {
    validations? : Array<any>
    presentation?: any
    index? : boolean
    autoIncrement? : boolean
    key? : boolean
}

export class ModelPropertyData {
    constructor(name : string, value? : any, options? : ModelPropertyDataOptions){
        this.name = name;
        this.value = value;
        if(options) {
            this.validations = options.validations || [];
            this.index = options.index || false;
            this.autoIncrement = options.autoIncrement || false;
            this.key = options.key || false;
        }
    }
    public name : string;
    public value : any;
    public validations : Array<any> = [];
    public presentation : any;
    public index : boolean = false;
    public autoIncrement : boolean = false;
    public key : boolean = false; 
}

export interface UpdateData {
    (key : string) : any
}

export class Model {

    constructor() {
        MetaManager.execute(this);
    }

    public __storage : Storage;

    public __commands : CommandManager =  new CommandManager();
    
    public presentations() : Promise<PresentationTree> { 
        return;
    }

    public validations() : any {
        return;
    }

    public getName(){
        return this.constructor.name;
    }

    /**
     * validate a property by its name
     * @param propertyName 
     * @param value an optional validation value, used to validate incoming update values
     */
    private async validateProperty(propertyName : string, value? : any) : Promise<Array<ValidationMessage>> {
        let data = this.getProperty(propertyName);
        if(!data){
            return [];
        }
        let validationMessages = [];
        for(let validation of data.validations){
            value = (value !== undefined) ? value : data.value;
            validationMessages.push(await Validator.validate(value, validation.value,  this.getName(), propertyName))
        }
        if(validationMessages.length){
            return validationMessages;
        }
        return [new ValidationMessage(ValidationMessageStates.success)];
    }

    private hasErrors(messages : Array<ValidationMessage>){
        for(let entry of messages){
            if(entry.state === ValidationMessageStates.error){
                return true;
            }
        }
        return false;
    }

    private getPropertyNames(){
        let propertieNames = Reflect.ownKeys(this);
        return propertieNames.filter((current : string) => {
            return !current.startsWith('_')
        })
    }

    private async getKeys() {
        let properties = await this.properties();
        let keys = properties
            .filter((current) => current.key)
            .map((current) => current.name);

        if(!keys.length){
            throw new Error('No Keys for model "' + this.constructor.name + "' specified!")
        }
        return keys;
    }

    /**
     * validates the complete model
     * @param data if data is defined this values will used for validation
     */
    public async validate(data? : any) : Promise<ValidationResult> {
        let propertieNames = this.getPropertyNames()
        let propertyListMessageList : PropertyValidationMessageList | {} = {};
        let isValid = true;
        if(!propertieNames.length){
            throw new Error('The model "' + this.constructor.name + '" has no defined properties. Maybe you forgot to define a default value')
        }
        for(let propertyName of propertieNames){
            propertyListMessageList[propertyName] = {
                isValid : false,
                messages : []
            }
            let value = (data && data[propertyName]) ? data[propertyName] : null;
            let validationMessage = await this.validateProperty(propertyName as string, value);
            propertyListMessageList[propertyName].messages = propertyListMessageList[propertyName].messages.concat(validationMessage)
            propertyListMessageList[propertyName].isValid = !this.hasErrors(propertyListMessageList[propertyName].messages)
            if(!propertyListMessageList[propertyName].isValid){
                isValid = false;
            }
        }
        return {
            isValid : isValid,
            properties : propertyListMessageList
        }
    }

    private async convertToModelPropertyData(data : any){
        let output : Array<ModelPropertyData> = [];
        let properties = await this.properties();
        for(let i = 0; i < properties.length; i++){
            if(data.hasOwnProperty(properties[i].name)){
                properties[i].value = data[properties[i].name];
            }
        }
        return properties;
    }

    private async convertToResourceAccessKey(data : any) : Promise<ResourceAccessKey> {
        try {
            let output : ResourceAccessKey = {};
            let keys = await this.getKeys();
    
            for(let key of keys){
                if(!data.hasOwnProperty(key)){
                    throw new Error('Can not convert data to RessourceAccessKey, because the data has not property "' + key + '"');
                }
                output[key] = data[key];
            }

            return output;
        }catch(e) {
            throw e;
        }
    }

     /**
     * filters metadata by propertyName and metadata type 
     * @param propertyName 
     * @param type 
     * @returns returns an array of metadata
     */
    private getMetaData(propertyName : string, type : MetaDataTypes) : Array<MetaData> {
        return MetaManager.get(this).filter((current) => {
            return current.property === propertyName
                    && current.type === type
        });
    }

    private getFirstMetaData(propertyName : string, type : MetaDataTypes) : MetaData | null {
        let metaData = this.getMetaData(propertyName, type);
        if(metaData.length){
            return metaData[0];
        }
        return null;
    }

    /**
     * gets a property, with metadata by its propertyName
     * @param propertyName 
     */
    private getProperty(propertyName : string) : ModelPropertyData | null{
        if(!propertyName.startsWith('_') && typeof propertyName !== 'function'){
            let autoIncrement =  this.getFirstMetaData(propertyName, MetaDataTypes.autoIncrement);
            let index = this.getFirstMetaData(propertyName, MetaDataTypes.index);
            let key = this.getFirstMetaData(propertyName, MetaDataTypes.key);
            return new ModelPropertyData(
                propertyName,
                this[propertyName],
                { 
                    validations : this.getMetaData(propertyName, MetaDataTypes.validation),
                    autoIncrement : (autoIncrement) ? autoIncrement.value : false,
                    index : (index) ? index.value : false,
                    key : (key) ? key.value : false
                 }
            )
        }
        return null;
    }

 
    public async query(query : any) : Promise<any> {

    }

    /**
     * creates a new model entry
     * @param data and key / value object with the data
     * @throws throws an validation error if the data is not valid
     */
    public async create(data : any) : Promise<boolean> {
        try {
            let validation = await this.validate(data);
            if(!validation.isValid) {
                throw new ModelValidationError(
                    'Model "' + this.constructor.name + '" is not valid!',
                    this.constructor.name,
                    validation
                )
            }
            let propertyData = await this.convertToModelPropertyData(data);
            let result = await this.__storage.create(propertyData);
            return result;
        }catch(e){
            throw e;
        }
    }

    /**
     * reads an entry by the given resource 
     * @param resource
     */
    public async read(resource : any) : Promise<any> {
        try {
            let accessKey = await this.convertToResourceAccessKey(resource);
            let result = await this.__storage.read(accessKey);
            return result;
        }catch(e){
            throw e;
        }
    }

    /**
     * updates an existing entry
     * @param resource
     * @param data 
     * @throws throws an ModelValidationError if the data is not valid
     */
    public async update(resource : any, data : any) : Promise<any> {
        try {
            let accessKey = await this.convertToResourceAccessKey(resource);
            let currentData = await this.read(accessKey);
            for(let prop in data){
                if(data.hasOwnProperty(prop)){
                    currentData[prop] = data[prop];
                }
            }
            let validation = await this.validate(currentData);
            if(!validation.isValid) {
                throw new ModelValidationError(
                    'Model "' + this.constructor.name + '" is not valid!',
                    this.constructor.name,
                    validation
                )
            }
            let propertyData = await this.convertToModelPropertyData(currentData);
            return this.__storage.update(accessKey, propertyData);
        }catch(e){
            throw e;
        }
    }

    /**
     * removes a resource
     * @param resource 
     */
    public async remove(resource : any) : Promise<any> {
        try {
            let accessKey = await this.convertToResourceAccessKey(resource);
            return this.__storage.remove(accessKey);
        }catch(e){
            throw e;
        }
    }


    /**
     * a list of alle model properties with its meta data
     */
    public async properties() : Promise<Array<ModelPropertyData>> {
        let properties = [];
        let propertieNames = this.getPropertyNames()
        for(let prop of propertieNames){
            prop = prop as string;
            let data = this.getProperty(prop);
            if(data) {
                properties.push(data);
            }
        }
        return properties;
    }
}

export function ModelOptions(options : any){
    return options;
}

export function ModelFactory(model : any){
    return new model;
}