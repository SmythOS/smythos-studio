#!/bin/bash

# Get the project root dynamically
root=$(git rev-parse --show-toplevel)

# Check if the root/modules directory exists, if not create it
modules_dir="$root/src/modules"
if [ ! -d "$modules_dir" ]; then
    mkdir "$modules_dir"
fi

# Check if -h flag was passed
if [ "$1" = "-h" ]; then
    echo "This script creates a new module in the project."
    echo "Usage: create-module.sh [module_name]"
    exit 0
fi

# Get the name from the command line argument
name="$1"

# Create the directory with the given name inside the modules directory
module_dir="$modules_dir/$name"
mkdir "$module_dir"

# Create the required empty directories inside the module directory
mkdir "$module_dir/services"
mkdir "$module_dir/utils"
mkdir "$module_dir/controllers"
mkdir "$module_dir/routers"
