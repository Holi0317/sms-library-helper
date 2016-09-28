declare module 'named-routes' {
  import express = require('express');
  class Router {
    extendExpress(app: express.Application): void;
    registerAppHelpers(app: express.Application): void;
  }
  export = Router
}