/// <reference types="vite/client" />
declare module "virtual:space-force-assets" {
  const assets:Record<string,{body:string;hash:string;type:string}>;
  export default assets;
}
