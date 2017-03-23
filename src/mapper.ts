import { Data } from "./data";
import { UndefinedPropertyError } from "./error";
import { Attribute } from "./type";

export type Attributes = Map<string, Attribute>;

export interface MapperOptions {
    readonly?: boolean;
    strict?: boolean;
    [key: string]: any;
}

export abstract class Mapper {
    protected attributes: Attributes;
    protected service: string;
    protected collection: string;
    protected primaryKeys: Set<string> = new Set<string>();
    protected options: MapperOptions;

    constructor(service: string, collection: string, attributes: Attributes, options?: MapperOptions) {
        this.service = service;
        this.collection = collection;

        let defaults = {
            readonly: false,
            strict: false,
        };

        if (options === undefined) {
            this.options = defaults;
        } else {
            this.options = { ...defaults, ...options };
        }

        this.setAttributes(attributes);
    }

    public isReadonly(): boolean {
        return this.getOption("readonly");
    }

    public hasOption(key: string): boolean {
        return this.options.hasOwnProperty(key);
    }

    public getOptions(): object {
        return this.options;
    }

    public getOption(key: string) {
        if (!this.hasOption(key)) {
            throw new Error(`Undefined Mapper option: ${key}`);
        }

        return this.options[key];
    }

    public getCollection(id?: object): string {
        return this.collection;
    }

    public getPrimaryKeys(): Set<string> {
        return this.primaryKeys;
    }

    public setAttributes(attributes: Attributes): this {
        this.attributes = attributes;

        attributes.forEach((attribute, key) => {
            if (attribute.primary) {
                this.primaryKeys.add(key);
            }
        });

        return this;
    }

    public hasAttribute(key: string): boolean {
        return this.attributes.has(key);
    }

    public getAttributes(): Attributes {
        return this.attributes;
    }

    public getAttribute(key: string): Attribute {
        if (!this.hasAttribute(key)) {
            throw new UndefinedPropertyError(`Undefined property: ${key}`);
        }

        return this.attributes.get(key) as Attribute;
    }

    public async find(id): Promise<Data | null> {
        return Promise.resolve(null);
    }

    public async save(data: Data): Promise<Data> {
        return Promise.resolve(data);
    }

    public async destroy(data: Data): Promise<boolean> {
        if (data.isFresh()) {
            return Promise.resolve(true);
        }

        return await this.doDelete(data);
    }

    protected async insert(data: Data): Promise<Data> {
        await this.doInsert(data);

        return Promise.resolve(data);
    }

    protected async update(data: Data): Promise<Data> {
        await this.doUpdate(data);

        return Promise.resolve(data);
    }

    protected abstract getService(id?: object);
    protected abstract async doFind(id: object, service?: object, collection?: string): Promise<object>;
    protected abstract async doInsert(data: Data, service?: object, collection?: string): Promise<object>;
    protected abstract async doUpdate(data: Data, service?: object, collection?: string): Promise<object>;
    protected abstract async doDelete(data: Data, service?: object, collection?: string): Promise<boolean>;
}
