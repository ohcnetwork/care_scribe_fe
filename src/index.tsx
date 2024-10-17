import { PluginManifest } from "@/pluginTypes";
import { ReactNode, useEffect } from "react";

export { default as manifest } from "./manifest";

export function Entry(){

    useEffect(() => {
        console.log("Plugin mounted")
    },[])
    
    return (
        <div>
            h
        </div>
    )
}