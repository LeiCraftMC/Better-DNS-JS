
// /**
//  * [Writer description]
//  */
// function BufferWriter() {
//   this.buffer = [];
// }

// /**
//  * [write description]
//  * @param  {[type]} d    [description]
//  * @param  {[type]} size [description]
//  * @return {[type]}      [description]
//  */
// BufferWriter.prototype.write = function(d, size) {
//   for (let i = 0; i < size; i++) {
//     this.buffer.push((d & Math.pow(2, size - i - 1)) ? 1 : 0);
//   }
// };

// /**
//  * [writeBuffer description]
//  * @param {[type]} b [description]
//  */
// BufferWriter.prototype.writeBuffer = function(b) {
//   this.buffer = this.buffer.concat(b.buffer);
// };

// /**
//  * [toBuffer description]
//  * @return {[type]} [description]
//  */
// BufferWriter.prototype.toBuffer = function() {
//   const arr = [];
//   for (let i = 0; i < this.buffer.length; i += 8) {
//     const chunk = this.buffer.slice(i, i + 8);
//     arr.push(parseInt(chunk.join(''), 2));
//   }
//   return Buffer.from(arr);
// };

// module.exports = BufferWriter;


export class BufferWriter {

	protected buffer: number[];

	constructor() {
		this.buffer = [];
	}

	public write(d: number, size: number): void {
		for (let i = 0; i < size; i++) {
			this.buffer.push((d & Math.pow(2, size - i - 1)) ? 1 : 0);
		}
	};


	public writeBuffer(writer: BufferWriter) {
		this.buffer = this.buffer.concat(writer.buffer);
	};


	public toBuffer() {
		const arr = [];
		for (let i = 0; i < this.buffer.length; i += 8) {
			const chunk = this.buffer.slice(i, i + 8);
			arr.push(parseInt(chunk.join(''), 2));
		}
		return Buffer.from(arr);
	};

}