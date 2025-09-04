// function extractNpmImports(code) {
//     const importRegex = /import\s+(?:[\w*\s{},]*\s+from\s+)?['"]([^'"]+)['"]/g;
//     const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
//     const dynamicImportRegex = /import\(['"]([^'"]+)['"]\)/g;

//     let libraries = new Set();
//     let match;

//     // Function to extract the main package name
//     function extractPackageName(modulePath) {
//         if (modulePath.startsWith("@")) {
//             // Handle scoped packages (e.g., @babel/core)
//             return modulePath.split("/").slice(0, 2).join("/");
//         }
//         return modulePath.split("/")[0]; // Extract the first part (main package)
//     }

//     // Match static ESM imports
//     while ((match = importRegex.exec(code)) !== null) {
//         libraries.add(extractPackageName(match[1]));
//     }

//     // Match CommonJS require() calls
//     while ((match = requireRegex.exec(code)) !== null) {
//         libraries.add(extractPackageName(match[1]));
//     }

//     // Match dynamic import() calls
//     while ((match = dynamicImportRegex.exec(code)) !== null) {
//         libraries.add(extractPackageName(match[1]));
//     }

//     return Array.from(libraries);
// }

// console.log(extractNpmImports(`
// import '@vendor/package-name';
// import { tool } from 'package'
// import * as tool from 'package';
// import express from "express";
// import { readFile } from "fs"
// const axios = require("axios");
// const lodash = require('lodash');
// import "dotenv/config"
// import "@babel/core"
// const dynamic = import("moment/locale/es");
// require('dotenv').config()
// `));
import os from "os";
console.log(os.tmpdir());
