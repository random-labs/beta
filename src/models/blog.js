'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var blogSchema = new Schema({
    steemid: { type: String, required: true },
    title: { type: String, required: true },
    account: { type: String, required: true }, //steem account post is published to, typically 'peerquery'
    author: { type: String, required: true }, //this is a multi-author blog, so real author
    permlink: { type: String, required: true, unique: true },
    summary: { type: String, required: true },
    body: { type: String, required: true },
    meta_description: { type: String },
    created: { type: Date, default: Date.now, required: true },
    updated_at: { type: Date },
    url: { type: String, required: true },
    hidden: Boolean,

    //taxonomy
    category: { type: String, required: true },

    //affiliation
    project_title: { type: String },
    project_slug_id: { type: String },

    //stats
    view_count: { type: Number, default: 0 },
    vote_count: { type: Number, default: 0 },
    comment_count: { type: Number, default: 0 },
});

blogSchema.index(
    {
        title: 1,
        url: 1,
        author: 1,
        category: 1,
        permlink: 1,
        project_slug_id: 1,
        view_count: 1,
        vote_count: 1,
        comment_count: 1,
    },
    { name: 'blog_index' }
);

module.exports = mongoose.model('blogSchema', blogSchema);
