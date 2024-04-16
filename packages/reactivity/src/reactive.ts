import {track, trigger} from "./effect";

export const reactive = <T extends object>(target:T) => {
    return new Proxy(target, {
        get(target, key, receiver) {
            let res = Reflect.get(target, key, receiver)
            track(target, key)
            return res
        },
        set(target: T, p: string | symbol, newValue: any, receiver: any): boolean {
            let res = Reflect.set(target, p, newValue, receiver)
            if (res){
                trigger(target, p)
            }
            return res
        }
    })
}