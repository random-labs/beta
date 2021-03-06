'use strict';

var sc2 = require('steemconnect'),
    dsteem = require('dsteem'),
    markup = require('markup-builder'),
    Editor = require('../../lib/editor'),
    accounter = require('../../lib/helpers/account'),
    templator = require('../templator'),
    config = require('../../configs/config'),
    utils = require('../../lib/utils'),
    creator = require('../../lib/content-creator'),
    create_featured_reports = require('../../lib/creators/featured_reports'),
    issues_renderer = require('../renderers/issues'),
    client = new dsteem.Client(config.steem_api),
    timeago = require('timeago.js')();
//jquery is already universal through the `scripts.js` global file

//set up editor
Editor.disable_image_upload();

var post_category = '';
var parent_author = '';
var parent_permlink = '';

const access_token = sessionStorage.access_token || 'access_token';

const steem_api = sc2.Initialize({
    app: config.sc2_app_name,
    callbackURL: window.location.href,
    accessToken: access_token,
    scope: config.sc2_scope_array,
});

const mk_opt = {
    video: true,
    account_scheme: '/peer',
    hashtag_scheme: '/reports/trending',
};

var permlink = window.location.pathname.split('/')[2];
var author = accounter.extract(permlink);
var report;
var author_earnings;

$(window).on('load', async function() {
    try {
        report = await client.database.call('get_content', [author, permlink]);

        //if (!report || report.author == '') {pqy_notify.warn('Sorry, could not load post.'); return;}
        if (!report || report.author == '') {
            var new_url = window.location.pathname.split('/')[2];
            author = accounter.extract(new_url);
            permlink = new_url.replace(author + '-', '');

            report = await client.database.call('get_content', [
                author,
                permlink,
            ]);

            if (!report || report.author == '') {
                pqy_notify.warn('Sorry, could not load post.');
                return;
            }
        }

        author_earnings = Math.max(
            Number(report.pending_payout_value.split(' ')[0]),
            Number(report.total_payout_value.split(' ')[0]) +
                Number(report.curator_payout_value.split(' ')[0])
        ).toFixed(2);

        //do some nasty DOM manipulations
        document.title = report.title + ' - Peer Query'; //set title again, for the sake of posts not created on pq
        document.getElementById('last_active').title = new Date(
            report.active
        ).toDateString();
        document.getElementById('last_active').innerText = timeago.format(
            report.active
        );
        document.getElementById('author_earnings').innerText =
            '$' +
            author_earnings +
            ' - $' +
            (0.25 * author_earnings).toFixed(2);
        document.getElementById('report_created').title = new Date(
            report.created
        ).toDateString();
        document.getElementById('report_created').innerText = timeago.format(
            report.created
        );

        if (report.children > 0)
            document.getElementById('comment-sort').style.visibility =
                'visible';

        var type = '';

        if (report.category == 'peerquery') type = 'writes';
        if (report.category == 'utopian-io') type = 'published';

        const data = {};

        data.vote_toggle = report.id;
        data.slider_area = report.id + '-div';

        data.follow_btn_following = author;

        data.follow_btn_class = 'ui button';
        data.resteem_class = 'ui right floated button';

        if (author == active_user)
            data.follow_btn_class = data.follow_btn_class + ' disabled';
        if (author == active_user)
            data.resteem_class = data.resteem_class + ' disabled';

        data.vote_btn_author = report.author;
        data.vote_btn_href = report.permlink;
        data.vote_btn_state = 'false';
        data.vote_btn_id = report.id + '-btn';

        data.range_id = report.id + '-range';
        data.votespan_id = report.id + '-percent';

        data.votes_id = report.id + '-rescount';

        data.post_voter_main_id = report.id + '-voterlist';

        data.title = report.title;
        data.author = report.author;
        data.href = report.permlink;
        data.author_name = report.author.toUpperCase();
        data.author_href = '/peer/' + report.author;
        data.author_img =
            'https://steemitimages.com/u/' + report.author + '/avatar';
        data.category = report.category;
        data.type = type;
        data.created = timeago.format(report.created);
        data.author_rep = utils.reputation(report.author_reputation);
        data.body = await markup.build.content(report.body, mk_opt);

        data.active_votes = report.active_votes.length;
        data.active_comments = report.children;
        data.earned = author_earnings.split('.')[0];

        if (author == active_user) {
            data.follow_btn_class = 'ui disabled button';
            data.resteem_btn_class = 'ui disabled right floated button';
        }

        //tags
        if (report.json_metadata) {
            var metadata = JSON.parse(report.json_metadata);
            if (metadata.tags) {
                data.issues = await issues_renderer(metadata.tags);
            }
        }

        //social media button hrefs
        data.fb =
            'https://www.facebook.com/sharer/sharer.php?u=' + window.location;
        data.twitter =
            'http://twitter.com/share?text=' +
            document.title +
            report.title +
            '&url=' +
            window.location +
            '&hashtags=peerquery,' +
            report.category;
        data.gplus = 'https://plus.google.com/share?url=' + window.location;
        data.linkedin =
            'https://www.linkedin.com/shareArticle?mini=true&url=' +
            window.location +
            '&title=' +
            encodeURI(report.title) +
            '&summary=&source=peerquery.com';
        data.reddit =
            'http://reddit.com/submit?url=' +
            window.location +
            '&amp;title=' +
            document.title;
        data.tumblr =
            'http://www.tumblr.com/share?v=3&u=' +
            window.location +
            '&t=' +
            document.title;

        var report_view = await templator.report(data);
        $('#report_view').append(report_view);

        $('#loader').hide();

        utils.check_vote(report, report.active_votes);

        if (report.net_votes > 0) {
            document.getElementById(
                report.id + '-rescount'
            ).innerText = utils.count_votes(report.active_votes);
        } else if (report.net_votes < 0) {
            document.getElementById('netvotes').className = 'angle down icon';
            document.getElementById(
                report.id + '-rescount'
            ).innerText = utils.count_votes(report.active_votes);
        } else if (report.net_votes == 0) {
            document.getElementById(report.id + '-rescount').innerText = ' 0';
        }

        post_category = report.parent_permlink;
        parent_author = report.author;
        parent_permlink = report.permlink;
    } catch (err) {
        console.log(err);
    }

    function votePanelBtn(eID) {
        if (!active_user || active_user === '') {
            window.location.href = '/login';
            return;
        }

        var slidrDiv = document.getElementById(eID + '-div');
        var slidr = document.getElementById(eID + '-range');

        $('#' + eID + '-div').slideToggle();
    }

    function vote(elID) {
        if (document.getElementById(elID).className.indexOf('disabled') == -1) {
            //this code makes sure that the click only works when the button is NOT disabled

            var vter = active_user;
            var athor = document.getElementById(elID).dataset.author;
            var pmlink = document.getElementById(elID).dataset.href;
            //var weight = Number(document.getElementById(parseInt(elID) + "-range").value);  // not recommended since it removes -/negative values
            //var weight = parseInt(document.getElementById(parseInt(elID) + "-range").value);
            var weight = parseInt(document.getElementById(elID).dataset.value);

            var cClass = document.getElementById(elID).className;
            var vClass = cClass + ' disabled';

            document.getElementById(elID).className = vClass; //disable the button while the OP is in progress
            document.getElementById(parseInt(elID) + '-range').disabled = true; //disbale the slider once the OP is in progress

            steem_api.vote(vter, athor, pmlink, weight, function(err, reslt) {
                //console.log(err, reslt);
                if (err) {
                    window.pqy_notify.warn(err + '\n' + 'Please try again!');
                    document.getElementById(elID).className = cClass; //re-enable the btn after OP is done
                    console.log(err);
                } else {
                    //console.log(reslt)
                    document.getElementById(elID).className = cClass; //re-enable the btn after OP is done

                    if (reslt.result.operations[0][1].weight > 0) {
                        document.getElementById(elID).dataset.votestate =
                            'true';
                        //document.getElementById(elID).className = "btn btn-warning btn-sm fa fa-thumbs-down float-right";
                        document.getElementById(elID).dataset.value = '0';
                        document.getElementById(elID).innerText = ' Unvote';
                        document.getElementById(
                            parseInt(elID) + '-percent'
                        ).innerHTML =
                            '<span class=\'desktop-only\'>Upvoted at: </span>' +
                            document.getElementById(parseInt(elID) + '-range')
                                .value /
                                100 +
                            '%';
                        document.getElementById(
                            parseInt(elID) + '-rescount'
                        ).innerText =
                            ' ' +
                            (Number(
                                document.getElementById(
                                    parseInt(elID) + '-rescount'
                                ).innerText
                            ) +
                                1);
                        //document.getElementById(parseInt(elID) + "-range").disabled = true; //disable the slider after a vote is down
                        console.log('voted successfully');
                    } /* if (reslt.result.operations[0][1].weight = 0) */ else {
                        // } else if {... does NOT work
                        document.getElementById(elID).dataset.votestate =
                            'false';
                        document.getElementById(elID).dataset.value = '2000';
                        document.getElementById(
                            parseInt(elID) + '-range'
                        ).value = '2000';
                        //document.getElementById(elID).className = "btn btn-success btn-sm fa fa-thumbs-up float-right";
                        document.getElementById(
                            parseInt(elID) + '-range'
                        ).disabled = false; //re-enable the slider when a vote is removed
                        document.getElementById(
                            parseInt(elID) + '-percent'
                        ).innerHTML =
                            '<i class="thumbs up icon"></i><span class="desktop-only">Upvote</span>';
                        document.getElementById(elID).innerText =
                            ' +' +
                            document.getElementById(parseInt(elID) + '-range')
                                .value /
                                100 +
                            '%';
                        document.getElementById(
                            parseInt(elID) + '-rescount'
                        ).innerHTML =
                            ' ' +
                            (Number(
                                document.getElementById(
                                    parseInt(elID) + '-rescount'
                                ).innerText
                            ) +
                                -1);
                        console.log('vote removed!');
                    }
                }
            });
        }
    }

    function addresponse() {
        document.getElementById('comment_btn').className =
            'ui disabled blue labeled submit icon button';
        var message =
            $('<div />')
                .html(
                    $('<div />')
                        .html(Editor.setup.getMarkdown())
                        .find('span')
                        .contents()
                        .unwrap()
                        .end()
                        .end()
                        .html()
                )
                .find('span')
                .contents()
                .unwrap()
                .end()
                .end()
                .html() + config.comment_attribution;

        document.getElementById('editor').style =
            'pointer-events:none; opacity: 0.5; box-sizing: border-box; height: 400px;';

        //----toggle close the button, empty its contents and reload the comments area only then enable the disabled onces

        var tags = post_category;

        var comment_permlink = utils.comment_permlink_formatter(
            parent_author,
            active_user,
            parent_permlink
        );

        steem_api.comment(
            parent_author,
            parent_permlink,
            active_user,
            comment_permlink,
            '',
            message,
            '',
            async function(err, reslt) {
                //console.log(err, reslt)

                if (err) {
                    document.getElementById('comment_btn').className =
                        'ui blue labeled submit icon button';
                    document.getElementById('editor').style =
                        'box-sizing: border-box; height: 400px;';
                    Editor.setup.setHtml('');

                    var err_description = JSON.stringify(err.error_description);

                    if (!err_description) {
                        console.log(err);
                        window.pqy_notify.warn(
                            'Sorry, something went wrong. Please try again'
                        );
                        return;
                    }

                    if (err_description.indexOf('The comment is archived') > -1)
                        window.pqy_notify.warn(
                            'Post with the same permlink already exists and is archived, please change your permlink.'
                        );
                    if (
                        err_description.indexOf(
                            'You may only post once every 5'
                        ) > -1
                    )
                        window.pqy_notify.warn(
                            'You may only post once every five minutes!'
                        );
                } else {
                    console.log('Success!');

                    //now load and display only the new comment

                    var result = await client.database.call('get_content', [
                        active_user,
                        comment_permlink,
                    ]);

                    $('#response-form').slideToggle('slow');
                    document.getElementById('comment_btn').className =
                        'ui blue labeled submit icon button';
                    document.getElementById('editor').style =
                        'box-sizing: border-box; height: 400px;';
                    Editor.setup.setHtml('');

                    var comment_active_votes = [];

                    //comment_active_votes.push( await client.database.call('get_active_votes', [result[0].author, result[0].permlink]) );

                    var comment = await creator.comment(result);
                    $('#comments-container').append(comment);

                    //utils.check_response_votes(result[0], result[0].net_votes, comment_active_votes[x]);

                    responsesReady();

                    var tAnchor = '#' + result.id;

                    $('html, body').animate(
                        { scrollTop: $(tAnchor).offset().top },
                        1000
                    );

                    $('#item-' + result.id).addClass('background_highlighted');
                }
            }
        );
    }

    //
    //get one blog post from our blog
    var blog_result = await client.database.getDiscussions('blog', {
        tag: 'peerquery',
        limit: 1,
    });
    document.getElementById('last-blog-post').innerHTML =
        '<a href=\'/report/' +
        blog_result[0].author +
        '-' +
        blog_result[0].permlink +
        '\'>' +
        blog_result[0].title +
        '</a>';
    document.getElementById('from-blog').style.display = 'block';

    //
    //get featured reports
    if (window.project_slug_id) {
        try {
            let data = await Promise.resolve(
                $.get(
                    '/api/featured_reports/project/' +
                        window.project_slug_id +
                        '/' +
                        permlink
                )
            );

            if (data.length) {
                for (let x in data) {
                    data[x].created = timeago.format(data[x].created);
                    $('#featured_reports').append(
                        create_featured_reports(data[x])
                    );
                }

                document.getElementById(
                    'featured-reports-section'
                ).style.display = 'block';
            }
        } catch (err) {
            console.log(err);
            pqy_notify.warn('Error fetching related reports');
        }
    }

    //event listeners

    $('#share-toggle').on('click', function() {
        $('#share-area').slideToggle('slow');
    });

    $('#comment_btn').on('click', function() {
        addresponse();
    });

    $('#comments-container, #report_view')
        .on('click', '.vote_toggle', function() {
            votePanelBtn(this.id);
        })
        .on('click', '.vote_btn', function() {
            vote(this.id);
        });

    $('#response-toggle').click(function() {
        if (!active_user || active_user === '') {
            window.location.href = '/login';
            return;
        }
        $('#response-form').slideToggle('slow');
    });

    $('.comment_sort').click(async function() {
        var sort = this.id;

        document.getElementById('comments-container').innerHTML = '';
        document.getElementById('comments-spinner').style.display = 'block';

        var comments = await client.database.call('get_content_replies', [
            author,
            permlink,
        ]);

        if (!comments || comments.length == 0) {
            document.getElementById('comments-spinner').style.display = 'none';
            document.getElementById('contributors_earnings').innerText =
                '$0' + ' + $' + (0.25 * author_earnings).toFixed(2);
            responsesReady();
            return;
        }

        if (sort == 'oldest') comments === comments;
        if (sort == 'trending')
            comments = await comments.sort(function(a, b) {
                return Number(b.net_rshares) - Number(a.net_rshares);
            });
        if (sort == 'newest')
            comments = await comments.sort(function(a, b) {
                return b.id - a.id;
            });
        if (sort == 'voted')
            comments = await comments.sort(function(a, b) {
                return b.net_votes - a.net_votes;
            });

        var comment_active_votes = [];

        var contributors_earnings = comments.reduce(function(prev, cur) {
            return (
                prev +
                Number(
                    Math.max(
                        Number(cur.pending_payout_value.split(' ')[0]),
                        Number(cur.total_payout_value.split(' ')[0]) +
                            Number(cur.curator_payout_value.split(' ')[0])
                    ).toFixed(3)
                )
            );
            //return prev + cur.msgCount;
        }, 0);

        for (let x in comments) {
            comment_active_votes.push(
                await client.database.call('get_active_votes', [
                    comments[x].author,
                    comments[x].permlink,
                ])
            );
        }

        document.getElementById('contributors_earnings').innerText =
            '$' +
            contributors_earnings.toFixed(2) +
            ' + $' +
            (0.25 * author_earnings).toFixed(2);
        document.getElementById(
            'responsescount'
        ).innerText = comments.length.toLocaleString();
        document.getElementById('comments-spinner').style.display = 'none';

        for (let x in comments) {
            var comment = await creator.comment(comments[x]);
            $('#comments-container').append(comment);

            utils.check_response_votes(
                comments[x],
                comments[x].net_votes,
                comment_active_votes[x]
            );
        }

        responsesReady();
    });

    $('#resteem').click(function() {
        if (!active_user || active_user === '') {
            window.location.href = '/login';
            return;
        }

        document.getElementById('resteem').className =
            'ui disabled right floated button';

        steem_api.reblog(
            active_user,
            this.dataset.author,
            this.dataset.href,
            function(err, rRes) {
                if (err) {
                    let err_description = JSON.stringify(err.error_description);
                    if (!err_description) {
                        window.pqy_notify.warn(
                            'Sorry, something went wrong. Please try again'
                        );
                        return;
                    }

                    if (
                        err_description.indexOf(
                            'Account has already re-blogged this post'
                        ) > -1
                    ) {
                        window.pqy_notify.inform(
                            'You have already reblogged this post'
                        );
                        console.log('Already re-blogged');
                    }
                } else {
                    window.pqy_notify.inform(
                        'You have already reblogged this post'
                    );
                    console.log('Resteemed!');
                }
            }
        );
    });

    $('#follow-btn').click(function() {
        if (!active_user || active_user === '') {
            window.location.href = '/login';
            return;
        }

        document.getElementById('follow-btn').className = 'ui disabled button';

        var following = document.getElementById('follow-btn').dataset.following;
        var follower = active_user;

        if (follower == following) {
            window.pqy_notify.warn('You cannot follow yourself!');
            return;
        }

        steem_api.follow(follower, following, function(err, res) {
            //console.log(err, res);
            if (err) {
                console.log(err);
                return;
            }
            console.log('Successfully followed');
        });
    });

    //keep down here else risk it not working
    //must be called last, after functions are loaded and post is also processed
    document.getElementById('voted').click();
});
