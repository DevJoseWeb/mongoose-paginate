var mongoosePaginate = require('../index');
var mongoose         = require('mongoose');

var chai           = require('chai');
var chaiAsPromised = require('chai-as-promised');
var expect         = require('chai').expect;

chai.use(chaiAsPromised);

const MONGO_URI = 'mongodb://localhost/mongoose_paginate_test';


var AuthorSchema = new mongoose.Schema({ name: String });
var Author       = mongoose.model('Author', AuthorSchema);

var BookSchema = new mongoose.Schema({
    title:  String,
    date:   Date,
    author: {
        type: mongoose.Schema.ObjectId,
        ref:  'Author'
    }
});

BookSchema.plugin(mongoosePaginate);

var Book = mongoose.model('Book', BookSchema);


describe('mongoose-paginate', function() {
    before(function(done) {
        mongoose.connect(MONGO_URI, done);
    });

    before(function(done) {
        mongoose.connection.db.dropDatabase(done);
    });

    before(function() {
        var book, books = [];
        var date = new Date();

        return Author.create({ name: 'Arthur Conan Doyle' }).then(function(author) {
            for (var i = 1; i <= 100; i++) {
                book = new Book({
                    title:  'Book #' + i,
                    date:   new Date(date.getTime() + i),
                    author: author._id
                });
                books.push(book);
            }

            return Book.create(books);
        });
    });

    it('returns promise', function() {
        var promise = Book.paginate();
        expect(promise.then instanceof Function).to.be.true;
    });

    it('calls callback', function(done) {
        Book.paginate({}, {}, function(err, result) {
            expect(err).to.equal(null);
            expect(result instanceof Object).to.be.true;

            done();
        });
    });

    it('uses criteria to search', function() {
        return Book.paginate({ title: 'Book #10' }).then(function(result) {
            expect(result.docs.length).to.equal(1);
            expect(result.docs[0].title).to.equal('Book #10');
        });
    });

    describe('paginates', function() {
        describe('with pagination options', function() {
            it('offset and limit', function() {
                return Book.paginate({}, { offset: 30, limit: 20 }).then(function(result) {
                    expect(result.docs.length).to.equal(20);
                    expect(result.offset).to.equal(30);
                    expect(result.page).to.equal(2);
                    expect(result.limit).to.equal(20);
                    expect(result.pages).to.equal(5);
                    expect(result.total).to.equal(100);
                });
            });

            it('page and limit', function() {
                return Book.paginate({}, { page: 1, limit: 20 }).then(function(result) {
                    expect(result.docs.length).to.equal(20);
                    expect(result.offset).to.equal(0);
                    expect(result.page).to.equal(1);
                    expect(result.limit).to.equal(20);
                    expect(result.pages).to.equal(5);
                    expect(result.total).to.equal(100);
                });
            });

            it('default page=1 and limit=10', function() {
                return Book.paginate().then(function(result) {
                    expect(result.docs.length).to.equal(10);
                    expect(result.page).to.equal(1);
                });
            });

            it('zero limit', function() {
                return Book.paginate({}, { page: 1, limit: 0 }).then(function(result) {
                    expect(result.docs.length).to.equal(0);
                    expect(result.offset).to.equal(0);
                    expect(result.page).to.equal(1);
                    expect(result.limit).to.equal(0);
                    expect(result.pages).to.equal(Infinity);
                    expect(result.total).to.equal(100);
                });
            });
        });

        describe('with not-pagination options', function() {
            it('select', function() {
                return Book.paginate({}, { select: 'title' }).then(function(result) {
                    expect(result.docs[0].title).to.not.equal(undefined);
                    expect(result.docs[0].date).to.equal(undefined);
                });
            });

            it('sort', function() {
                return Book.paginate({}, { sort: { date: -1 } }).then(function(result) {
                    expect(result.docs[0].title).to.equal('Book #100');
                });
            });

            it('populate', function() {
                return Book.paginate({}, { populate: 'author' }).then(function(result) {
                    expect(result.docs[0].author.name).to.equal('Arthur Conan Doyle');
                });
            });

            describe('lean', function() {
                it('with default leanWithId=true', function() {
                    return Book.paginate({}, { lean: true }).then(function(result) {
                        expect(result.docs[0] instanceof mongoose.Document).to.be.false;
                        expect(result.docs[0].id).to.equal(String(result.docs[0]._id));
                    });
                });

                it('with leanWithId=false', function() {
                    return Book.paginate({}, { lean: true, leanWithId: false }).then(function(result) {
                        expect(result.docs[0] instanceof mongoose.Document).to.be.false;
                        expect(result.docs[0].id).to.equal(undefined);
                    });
                });
            });
        });
    });

    after(function(done) {
        mongoose.connection.db.dropDatabase(done);
    });

    after(function(done) {
        mongoose.disconnect(done);
    });
});