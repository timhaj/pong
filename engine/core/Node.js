export class Node {

    constructor() {
        this.parent = null;
        this.children = [];
        this.components = [];
    }

    addChild(node) {
        node.parent?.removeChild(node);
        this.children.push(node);
        node.parent = this;
    }

    removeChild(node) {
        this.children = this.children.filter(child => child !== node);
        node.parent = null;
    }

    remove() {
        this.parent?.removeChild(this);
    }

    traverse(before, after) {
        before?.(this);
        for (const child of this.children) {
            child.traverse(before, after);
        }
        after?.(this);
    }

    linearize() {
        const array = [];
        this.traverse(node => array.push(node));
        return array;
    }

    filter(predicate) {
        return this.linearize().filter(predicate);
    }

    find(predicate) {
        return this.linearize().find(predicate);
    }

    map(transform) {
        return this.linearize().map(transform);
    }

    addComponent(component) {
        this.components.push(component);
    }

    removeComponent(component) {
        this.components = this.components.filter(c => c !== component);
    }

    removeComponentsOfType(type) {
        this.components = this.components.filter(component => {
            if (component instanceof type) {
                if (typeof component.destroy === 'function') {
                    component.destroy(); // Call the destroy method if it exists
                }
                return false; // Remove the component from the array
            }
            return true; // Keep the component in the array
        });
    }

    getComponentOfType(type) {
        return this.components.find(component => component instanceof type);
    }

    getComponentsOfType(type) {
        return this.components.filter(component => component instanceof type);
    }

}
