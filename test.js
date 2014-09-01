/*
 * test
 * console.log(box(0, 0, [[0, 0],[1, 1]]) == 0);
 * console.log(box(0, 1, [[0, 0],[1, 1]]) == 0);
 * console.log(box(1, 0, [[0, 0],[1, 1]]) == 1);
 * console.log(box(1, 1, [[0, 0],[1, 1]]) == 1);
 *
 * console.log(box(1, 1, [[0, 1],[1, 2]]) == 2);
 * console.log(box(0.5, 0.5, [[0, 1],[1, 2]]) == 1);
 */
function gradient_box(x, y, box) {
    var output = Math.round(
        (box[0][1] - box[0][0]) * y +
        (box[1][1] - box[1][0]) * y +
        (box[1][0] - box[0][0]) * x +
        (box[1][1] - box[0][1]) * x
     , 4) * 0.5;

    return output;
}