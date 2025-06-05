import{B as a}from"./CThrnvRT.js";class o extends a{async remove(e){return(await this.api.delete(`/volumes/${e}`)).data}async create(e){return(await this.api.post("/volumes",e)).data}}export{o as V};
