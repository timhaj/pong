import { vec3, mat4 } from 'glm';
import { getGlobalModelMatrix } from 'engine/core/SceneUtils.js';
import { Transform, Model } from 'engine/core.js';


export class Physics {

    constructor(scene) {
        this.scene = scene;
    }

    update(t, dt) {
        this.scene.traverse(node => {
            if (node.isDynamic) {
                this.scene.traverse(other => {
                    if (node !== other && other.isStatic) {
                        this.resolveCollision(node, other);
                    }
                });
            }
        });
    }

    intervalIntersection(min1, max1, min2, max2) {
        return !(min1 > max2 || min2 > max1);
    }

    aabbIntersection(aabb1, aabb2) {
        return this.intervalIntersection(aabb1.min[0], aabb1.max[0], aabb2.min[0], aabb2.max[0])
            && this.intervalIntersection(aabb1.min[1], aabb1.max[1], aabb2.min[1], aabb2.max[1])
            && this.intervalIntersection(aabb1.min[2], aabb1.max[2], aabb2.min[2], aabb2.max[2]);
    }

    getTransformedAABB(node) {
        // Transform all vertices of the AABB from local to global space.
        const matrix = getGlobalModelMatrix(node);
        const { min, max } = node.aabb;
        const vertices = [
            [min[0], min[1], min[2]],
            [min[0], min[1], max[2]],
            [min[0], max[1], min[2]],
            [min[0], max[1], max[2]],
            [max[0], min[1], min[2]],
            [max[0], min[1], max[2]],
            [max[0], max[1], min[2]],
            [max[0], max[1], max[2]],
        ].map(v => vec3.transformMat4(v, v, matrix));

        // Find new min and max by component.
        const xs = vertices.map(v => v[0]);
        const ys = vertices.map(v => v[1]);
        const zs = vertices.map(v => v[2]);
        const newmin = [Math.min(...xs), Math.min(...ys), Math.min(...zs)];
        const newmax = [Math.max(...xs), Math.max(...ys), Math.max(...zs)];
        return { min: newmin, max: newmax };
    }

    calculateTriangleNormal(vertexA, vertexB, vertexC) {
        const edge1 = vec3.sub(vec3.create(), vertexB, vertexA);
        const edge2 = vec3.sub(vec3.create(), vertexC, vertexA);
        const normal = vec3.create();
        vec3.cross(normal, edge1, edge2);
        vec3.normalize(normal, normal);
        return normal;
    }

    rayIntersectsTriangle(rayOrigin, rayDir, vertex0, vertex1, vertex2) {

        const EPSILON = 1e-6;
    
        // Compute the edges of the triangle
        const edge1 = vec3.create();
        const edge2 = vec3.create();
        vec3.sub(edge1, vertex1, vertex0); // edge1 = B - A
        vec3.sub(edge2, vertex2, vertex0); // edge2 = C - A
    
        // Compute the determinant
        const h = vec3.create();
        vec3.cross(h, rayDir, edge2);
        const a = vec3.dot(edge1, h);
    
        if (a > -EPSILON && a < EPSILON) {
            return false; // Ray is parallel to the triangle
        }
    
        const f = 1.0 / a;
        const s = vec3.create();
        vec3.sub(s, rayOrigin, vertex0);
        const u = f * vec3.dot(s, h);
    
        if (u < 0.0 || u > 1.0) {
            return false; // Intersection is outside of the triangle
        }
    
        const q = vec3.create();
        vec3.cross(q, s, edge1);
        const v = f * vec3.dot(rayDir, q);
    
        if (v < 0.0 || u + v > 1.0) {
            return false; // Intersection is outside of the triangle
        }
    
        // Compute the t value (the distance along the ray)
        const t = f * vec3.dot(edge2, q);
    
        if (t > EPSILON) {
            return t; // The ray intersects the triangle
        }
    
        return false; // Ray doesn't intersect the triangle
    }

    getClosestTriangle(rayOrigin, rayDir, vertices, indices, b) {
        let closestTriangle = null;
        let closestDistance = Infinity;
    
        // Loop through each triangle in the mesh
        for (let i = 0; i < indices.length; i += 3) {
            const i0 = indices[i];
            const i1 = indices[i + 1];
            const i2 = indices[i + 2];
    
            // Get the vertices of the triangle
            const vertex0 = [vertices[i0 * 3], vertices[i0 * 3 + 1], vertices[i0 * 3 + 2]];
            const vertex1 = [vertices[i1 * 3], vertices[i1 * 3 + 1], vertices[i1 * 3 + 2]];
            const vertex2 = [vertices[i2 * 3], vertices[i2 * 3 + 1], vertices[i2 * 3 + 2]];
            
            // Test for ray intersection with the triangle
            const matrix = getGlobalModelMatrix(b);
            vec3.transformMat4(vertex0, vertex0, matrix);
            vec3.transformMat4(vertex1, vertex1, matrix);
            vec3.transformMat4(vertex2, vertex2, matrix);
           
            const rayDirNormalized = vec3.normalize(vec3.create(), rayDir);
            const hit = this.rayIntersectsTriangle(rayOrigin, rayDirNormalized, vertex0, vertex1, vertex2);
    
            if (hit) {
                
                // Calculate the normal of the triangle
                const normal = this.calculateTriangleNormal(vertex0, vertex1, vertex2);
    
                // Calculate the intersection distance or use the first valid intersection
                const distance = vec3.distance(rayOrigin, vertex0); // Simplified; for a more accurate intersection point, you could compute t
    
                // Keep track of the closest triangle hit
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestTriangle = { vertex0, vertex1, vertex2, normal };
                }
            }
        }
    
        return closestTriangle;
    }

    resolveCollision(a, b) {
        // Get global space AABBs.
        let aBox = this.getTransformedAABB(a);
        let bBox = this.getTransformedAABB(b);
        
        // Check if there is collision.
        let isColliding = this.aabbIntersection(aBox, bBox);
        if (!isColliding) {
            return;
        }
        
        // Check if this node should stop completely
        if (a.ballin) {
            a.coll = true;
            const transform = a.getComponentOfType(Transform);
            if (!transform || a.stopTime) {
                return;
            }
            a.velocity[1] = -a.velocity[1] * a.restitution;
            
            

            


            let model = b.getComponentOfType(Model);

            const rayOrigin = transform.translation;
            const rayDir = a.velocity;
           
            
            let indices = [];
            let vertices = [];
            for (let i = 0;i<model.primitives[0].mesh.indices.length;i++){
                indices.push(model.primitives[0].mesh.indices[i][0]);
            }

            for (let i = 0;i<model.primitives[0].mesh.vertices.length;i++){
                vertices.push(model.primitives[0].mesh.vertices[i].position[0]);
                vertices.push(model.primitives[0].mesh.vertices[i].position[1]);
                vertices.push(model.primitives[0].mesh.vertices[i].position[2]);
            }
            
            
            // Find the closest triangle hit by the ball
            const closestTriangle = this.getClosestTriangle(rayOrigin, rayDir, vertices, indices, b);
            
            if (closestTriangle) {
                const normal = closestTriangle.normal; // Normalo trikotnika pridobite iz 'closestTriangle'
                const velocity = a.velocity;
            
                // Normalizirajte normalo, če še ni normalizirana
                const normalLength = Math.sqrt(normal[0] ** 2 + normal[1] ** 2 + normal[2] ** 2);
                const normalizedNormal = [
                    normal[0] / normalLength,
                    normal[1] / normalLength,
                    normal[2] / normalLength
                ];
                
                // Izračun zrcaljene hitrosti
                const dotProduct = velocity[0] * normalizedNormal[0] +
                                   velocity[1] * normalizedNormal[1] +
                                   velocity[2] * normalizedNormal[2];
                
                const reflection = [
                    velocity[0] - 2 * dotProduct * normalizedNormal[0],
                    velocity[1] - 2 * dotProduct * normalizedNormal[1],
                    velocity[2] - 2 * dotProduct * normalizedNormal[2]
                ];
            
                // Posodobite hitrost
                a.velocity = reflection;
               
            }
            if (Math.abs(a.velocity[1]) < 0.02) {
                a.velocity[1] = 0; // Stop vertical movement
                //a.acceleration[1] = 0; // Disable gravity
            }
            
            a.velocity[0] *= a.friction;
            a.velocity[2] *= a.friction;
            // Update position with velocity
            transform.translation[0] += a.velocity[0] * a.deltaTime; // X movement
            transform.translation[1] += a.velocity[1] * a.deltaTime; // Y movement
            transform.translation[2] += a.velocity[2] * a.deltaTime; // Z movement


            //PREVERIMO CE JE PO PREMIKU SE VEDNO KOALIZIJA, CE NI SE NE COLLIDA VEČ
            let aBox = this.getTransformedAABB(a);
            let bBox = this.getTransformedAABB(b);
            isColliding = this.aabbIntersection(aBox, bBox);
            if(!isColliding){
                //??? POWERMETER strenght apply???
                a.coll = false;
            }
            return;
        }
        else {

            // Smooth sliding behavior (existing code)
            const diffa = vec3.sub(vec3.create(), bBox.max, aBox.min);
            const diffb = vec3.sub(vec3.create(), aBox.max, bBox.min);
        
            let minDiff = Infinity;
            let minDirection = [0, 0, 0];
            if (diffa[0] >= 0 && diffa[0] < minDiff) {
                minDiff = diffa[0];
                minDirection = [minDiff, 0, 0];
            }
            if (diffa[1] >= 0 && diffa[1] < minDiff) {
                minDiff = diffa[1];
                minDirection = [0, minDiff, 0];
            }
            if (diffa[2] >= 0 && diffa[2] < minDiff) {
                minDiff = diffa[2];
                minDirection = [0, 0, minDiff];
            }
            if (diffb[0] >= 0 && diffb[0] < minDiff) {
                minDiff = diffb[0];
                minDirection = [-minDiff, 0, 0];
            }
            if (diffb[1] >= 0 && diffb[1] < minDiff) {
                minDiff = diffb[1];
                minDirection = [0, -minDiff, 0];
            }
            if (diffb[2] >= 0 && diffb[2] < minDiff) {
                minDiff = diffb[2];
                minDirection = [0, 0, -minDiff];
            }
        
            const transform = a.getComponentOfType(Transform);
            if (!transform) {
                return;
            }
        
            vec3.add(transform.translation, transform.translation, minDirection);
        }
    }

}
