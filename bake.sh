task:init() {
    task:initial_deps
    npm init
}

task:initial_deps() {
    set -e
    bake dev mocha
    bake dev istanbul
}

# Install node package
task:i() {
    npm i $@
}

# Install dev dependency
task:dev() {
    npm i --save-dev $@
}

task:cov() {
    npm run cov
}
