#!/usr/bin/env node

import 'dotenv/config';
import { createCLI } from './cli/commands.js';

const program = createCLI();
program.parse();
