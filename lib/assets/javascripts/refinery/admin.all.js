
(function (window, $) {

// Source: scripts/admin/admin.js
(function (refinery) {

    /**
     * Refinery Admin namespace
     *
     * @expose
     * @type {Object}
     */
    refinery.admin = {
        /**
         * Namespace for loading modules to ui
         *
         * @expose
         * @type {Object}
         */
        ui: {},

        /**
         * Backend path defined by Refinery::Core.backend_route
         * Default: '/refinery'
         * But also: '/en/refinery', '/pt-BR/refinery'
         *
         * @expose
         * @return {string}
         */
        backend_path: function () {
            var paths = document.location.pathname.split('/').filter(function (e) {
                return e !== '';
            });

            if (/^[a-z]{2}(-[a-zA-Z]{2,3})?$/.test(paths[0])) {
                return '/' + paths[0] + '/' + paths[1];
            } else {
                return '/' + paths[0];
            }
        }
    };

}(refinery));

// Source: scripts/admin/form.js
(function (refinery) {

    /**
     * @constructor
     * @class  refinery.admin.Form
     * @extends {refinery.Object}
     * @param {Object=} options
     */
    refinery.Object.create({

        name: 'Form',

        module: 'admin',

        /**
         * Switch locale
         *
         * @param {!jQuery} anchor
         *
         * @return {undefined}
         */
        switch_frontend_locale: function (anchor) {
            var that = this,
                /** @type {jquery_ui_button} */
                save_and_continue_btn,
                /** @type {jquery_ui_button} */
                continue_btn,
                /** @type {jquery_ui_button} */
                cancel_btn,
                dialog;

            save_and_continue_btn = {
                text: t('refinery.admin.form_unsaved_save_and_continue'),
                'class': 'submit-button',
                click: function () {
                    var form = that.holder,
                        locale = anchor.attr('class')
                                .match(/flag-([a-z]{2}(?:-[a-zA-Z]{2,3})?)?$/)[1];

                    $('<input/>', {
                        'type': 'hidden',
                        'name': 'switch_frontend_locale',
                        'value': locale
                    }).appendTo(form);

                    form.trigger('before-submit');
                    form.submit();
                }
            };

            continue_btn = {
                text: t('refinery.admin.form_unsaved_continue'),
                click: function () {
                    Turbolinks.visit(anchor.attr('href'));
                }
            };

            cancel_btn = {
                text: t('refinery.admin.form_unsaved_cancel'),
                click: function () {
                    dialog.dialog('close');
                }
            };

            dialog = $('<div/>', { html: t('refinery.admin.form_unsaved_html')} ).dialog({
                'resizable': false,
                'height': 140,
                'modal': true,
                'title': t('refinery.admin.form_unsaved_title'),
                'buttons': [save_and_continue_btn, continue_btn, cancel_btn]
            });

            that.on('destroy', function () {
                dialog.dialog('destroy');
            });
        },

        init_locale_picker: function () {
            var that = this,
                form = that.holder;

            form.on('click', '.locale-picker a', function (e) {
                if (that.initial_values !== form.serialize()) {
                    e.preventDefault();
                    e.stopPropagation();
                    that.switch_frontend_locale($(this));
                }
            });
        },

        init_upload: function () {
            var that = this,
                form = that.holder,
                csrf_param = $('meta[name=csrf-param]').attr('content'),
                file_inputs = form.find('input[type="file"]');

            if (file_inputs.length > 0) {
                form.on('submit', function (event) {
                    event.preventDefault();
                    event.stopPropagation();
                    refinery.spinner.on();

                    /**
                     * when form doesn't have included csrf token aka
                     * embed_authenticity_token_in_remote_forms is false
                     * then include it to hidden input from meta
                     */
                    if (form.find('input[name="' + csrf_param + '"]').length === 0) {
                        $('<input/>', {
                            'name': csrf_param,
                            'type': 'hidden',
                            'value': $('meta[name=csrf-token]').attr('content')
                        }).appendTo(form);
                    }

                    form.trigger('before-submit');

                    $.ajax(this.action, {
                            'data': form.serializeArray(),
                            'files': file_inputs,
                            'iframe': true,
                            'processData': false
                        }).done(
                        /**
                         * @param {json_response} response
                         * @param {string} status
                         * @param {jQuery.jqXHR} xhr
                         * @return {undefined}
                         */
                        function (response, status, xhr) {
                            form.trigger('ajax:success', [response, status, xhr]);
                        }).always(function () {
                            refinery.spinner.off();
                        });
                });
            }
        },

        /**
         * Handle click on preview button
         * If preview window exists it is refreshed after form change.
         *
         * @return {undefined}
         */
        init_preview: function () {
            var form = this.holder,
                prev_url = form.attr('action'),
                prev_target = form.attr('target'),
                prev_method = form.attr('method'),
                prev_remote = form.data('remote'),
                preview_btn = form.find('.preview-button'),
                preview_window;

            /**
             * @param  {Object} event
             * @return {undefined}
             */
            function stop_event_propagation (event) {
                event.stopPropagation();
            }

            /**
             * Submits form to window with name href attribute of preview link button.
             * If window doesn't exists or was closed create it at first.
             *
             * @return {undefined}
             */
            function preview_submit () {
                if (form.is(':valid')) {
                    // removing jquery_ujs form submit handle
                    form.removeData('remote');
                    form.removeAttr('data-remote');

                    if (!preview_window || preview_window.closed) {
                        preview_window = window.open('', preview_btn.attr('href'));
                    }

                    form.attr({
                        'action': preview_btn.attr('href'),
                        'method': 'POST',
                        'target': preview_btn.attr('href')
                    });

                    // trigger before-submit for listeners
                    form.trigger('before-submit');

                    // disable other events on form submit (jquery_ujs etc..)
                    form.on('submit', stop_event_propagation);

                    // submit to new window/tab
                    form.submit();

                    // enable other events on form submit
                    form.off('submit', stop_event_propagation);

                    form.attr({
                        'action': prev_url,
                        'method': prev_method,
                        'target': prev_target
                    });

                    if (prev_remote) {
                        form.attr('data-remote', prev_remote);
                        form.data('remote', prev_remote);
                    }
                } else {
                    // @todo
                    alert('Preview is not possible because form is not filled properly!');
                }
            }

            if (preview_btn.length > 0) {
                form.on('click', '.preview-button', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    preview_submit();
                });

                form.on('change', 'input, select, textarea', function () {
                    if (preview_window && !preview_window.closed) {
                        preview_submit();
                    }
                });
            }
        },

        /**
         * Include exclamation mark to submit button if form has unsaved changes.
         *
         * @return {undefined}
         */
        init_inputs: function () {
            var that = this,
                form = that.holder,
                submit_btn = form.find('.form-actions .submit-button'),
                submit_btn_val;

            if (submit_btn.length > 0) {
                submit_btn_val = submit_btn.val();
                form.on('change', 'input, select, textarea', function () {
                    if (that.initial_values !== form.serialize() &&
                        submit_btn_val[submit_btn_val.length] !== '!'
                    ) {
                        submit_btn.val(submit_btn_val + ' !');
                    } else {
                        submit_btn.val(submit_btn_val.replace(/ !$/, ''));
                    }
                });
            }

            function split( val ) {
                return val.split( /,\s*/ );
            }

            /**
             * @todo support for remote source
             * @return {undefined}
             */
            form.find('input.autocomplete').each(function () {
                var input = $(this),
                    data,

                    /**
                     *
                     * @type {jquery_ui_autocomplete_options}
                     */
                    options = input.data('autocomplete');

                if (options.multiple) {
                    data = /** Array */(options.source);

                    input.bind( 'keydown', function( event ) {
                        if ( event.which === $.ui.keyCode.TAB &&
                                $( this ).data('ui-autocomplete').menu.active ) {
                            event.preventDefault();
                        }
                    });

                    $.extend(options, {
                        select: function ( event, ui ) {
                            var terms = split( this.value );
                            // remove the current input
                            terms.pop();
                            // add the selected item
                            terms.push( ui.item.value );
                            // add placeholder to get the comma-and-space at the end
                            terms.push( '' );
                            this.value = terms.join( ', ' );

                            return false;
                        },

                        /**
                         *
                         * @param {jquery_ui_autocomplete_request} request
                         * @param {Function} response
                         */
                        source: function ( request, response ) {
                            var terms = split(request.term),
                                term = terms.pop(),
                                filtered_data = data.filter(function (term) {
                                    return terms.indexOf(term) === -1;
                                });

                            response( $.ui.autocomplete.filter( filtered_data, term ) );
                        },

                        focus: function () {
                            return false;
                        }
                    });
                }

                input.autocomplete(options);
            });
        },

        /**
         * Fix buttons to bottom of page if their holder is out of screen.
         *
         * @return {undefined}
         */
        init_fly_form_actions: function () {
            var that = this,
                $window = $(window),
                holder = that.holder.find('.form-actions'),
                left_buttons = that.holder.find('.form-actions-left');

            function scroll () {
                var window_position = $window.scrollTop() + $window.height(),
                    form_actions_pos = holder.position().top;

                if (window_position < form_actions_pos) {
                    left_buttons.addClass('fly');
                } else {
                    left_buttons.removeClass('fly');
                }
            }

            if (that.holder.find('textarea').length > 0 &&
                holder.length > 0 && left_buttons.length > 0) {

                $window.on('scroll', scroll);
                that.on('destroy', function () {
                    $window.unbind('scroll', scroll);
                });

                scroll();
            }
        },

        /**
         * initialisation
         *
         * @param {!jQuery} holder
         *
         * @return {Object} self
         */
        init: function (holder) {
            if (this.is('initialisable')) {
                this.is('initialising', true);
                this.holder = holder;
                this.init_locale_picker();
                this.init_inputs();
                this.init_upload();
                this.init_preview();
                this.initial_values = holder.serialize();
                this.init_fly_form_actions();

                this.is({'initialised': true, 'initialising': false});
                this.trigger('init');
            }

            return this;
        }
    });

    /**
     * Form initialization
     *
     * @expose
     * @param  {jQuery} holder
     * @param  {refinery.UserInterface} ui
     * @return {undefined}
     */
    refinery.admin.ui.form = function (holder, ui) {
        holder.find('form').each(function () {
            ui.addObject( refinery('admin.Form').init($(this)) );
        });
    };

}(refinery));

// Source: scripts/admin/form_page_parts.js
(function (refinery) {

    /**
     * @constructor
     * @extends {refinery.Object}
     * @param {Object=} options
     */
    refinery.Object.create({

        name: 'FormPageParts',

        module: 'admin',

        /**
         * Create list of page parts for dialog
         *
         * @return {string} dialog content
         */
        get_dialog_content: function (data) {
            var part,
                list = '<ul class="records">';

            for (var i = 0, l = data.length; i < l; i++) {
                part = /** @type {page_part} */(data[i]);
                list += '<li data-part="' + part.name + '" ' +
                            'class="clearfix" >' +
                            '<label class="stripped">' +
                            '<input type="checkbox"' + (part.active ? ' checked="1"' : '') + '> ' +
                             part.title +
                            '</label>' +
                            ' <span class="actions"><span class="icon-small move-icon">' +
                            t('refinery.admin.button_move') + '</span></span>' +
                            '</li>';

            }

            list += '</ul>';

            return list;
        },

        /**
         * Initialize page part dialog and bind events
         *
         * @return {undefined}
         */
        init_configuration_dialog: function () {
            var that = this,
                holder = that.holder,
                nav = holder.find('> .ui-tabs-nav'),
                parts_tabs = nav.find('li'),
                dialog_holder = $('<div/>'),
                dialog_buttons;

            dialog_holder.html(
                that.get_dialog_content(
                    holder.find('#page_parts-options').data('page-parts')
                )
            );

            function update_parts () {
                var list = [], i;

                dialog_holder.find('li').each(function (index) {
                    var li = $(this),
                        part = /** @type string */(li.data('part')),
                        active = li.find('input').is(':checked'),
                        tab = nav.find('li a[href="#page_part_' + part + '"]').parent().detach(),
                        panel = $('#page_part_' + part);

                    if (active) {
                        tab.removeClass('js-hide');
                        panel.removeClass('js-hide');
                    } else {
                        tab.removeClass('ui-tabs-active ui-state-active');
                        tab.addClass('js-hide');
                        panel.addClass('js-hide');
                    }

                    panel.find('input.part-active').prop('checked', active);
                    panel.find('input.part-position').val(index + '');

                    if (tab.length) {
                        list[list.length] = tab;
                    }
                });

                /**
                 * Reordering tabs by parts position
                 *
                 */
                for (i = list.length; i >= 0; i--) {
                    nav.prepend(list[i]);
                }

                /**
                 * Ensure that if we hide current active tab,
                 * will be activated other, first visible tab.
                 */
                if (nav.find('.ui-tabs-active').length === 0) {
                    holder.tabs({
                        'active': /** @type {number} */(parts_tabs.index(nav.find('li:visible').first()))
                    });
                }
            }

            dialog_buttons = [{
                'text': t('refinery.admin.button_done'),
                'class': 'submit-button',
                'click': function () {
                    update_parts();
                    dialog_holder.dialog('close');
                }
            }];

            dialog_holder.dialog({
                'title': t('refinery.admin.form_page_parts_manage'),
                'modal': true,
                'resizable': true,
                'autoOpen': false,
                'width': 400,
                'buttons': dialog_buttons
            });

            holder.on('click', '#page_parts-options', function (e) {
                e.preventDefault();
                dialog_holder.dialog('open');
            });

            that.on('destroy', function () {
                dialog_holder.dialog('destroy');
                dialog_holder.off();
            });
        },

        /**
         * initialisation
         *
         * @param {!jQuery} holder
         *
         * @return {Object} self
         */
        init: function (holder) {
            if (this.is('initialisable')) {
                this.is('initialising', true);
                this.holder = holder;
                this.init_configuration_dialog();
                this.is({'initialised': true, 'initialising': false});
                this.trigger('init');
            }

            return this;
        }
    });

    /**
     * Form initialization
     *
     * @expose
     * @param  {jQuery} holder
     * @param  {refinery.UserInterface} ui
     * @return {undefined}
     */
    refinery.admin.ui.formPageParts = function (holder, ui) {
        holder.find('#page_parts').each(function () {
            ui.addObject( refinery('admin.FormPageParts').init($(this)) );
        });
    };

}(refinery));

// Source: scripts/admin/sortable_list.js
(function (refinery) {

    /**
     * Sortable List
     *
     * @expose
     * @todo  refactor that SortableTree constructor and SortableList would be the same
     * @extends {refinery.Object}
     * @param {Object=} options
     * @param {boolean=} is_prototype
     */
    refinery.Object.create({

        /**
         * Configurable options
         *
         * @param {{nested_sortable: Object}} options
         */
        objectConstructor: function (options, is_prototype) {
            var that = this;

            refinery.Object.apply(that, arguments);

            if (!is_prototype) {

                /**
                 *
                 * @expose
                 * @param {*} event
                 * @param {*} ui
                 *
                 * @return {undefined}
                 */
                that.options.nested_sortable.stop = function (event, ui) {
                    that.update(ui.item);
                };
            }
        },

        name: 'SortableList',

        module: 'admin',

        /**
         * Configurable options
         *
         * @type {Object}
         */
        options: {
            /**
             * @expose
             * @type {{items: string, listType: string, maxLevels: number}}
             */
            nested_sortable: {
                listType: 'ul',
                items: 'li',
                maxLevels: 1
            }
        },

        /**
         * Serialized array of items
         *
         * @type {?Array}
         */
        set: null,

        /**
         * Html content of list holder
         *
         * @type {?string}
         */
        html: null,

        /**
         * Get Item id
         *
         * @param {!jQuery} item
         *
         * @return {?string}
         */
        getId: function (item) {
            if (item.attr('id') && /([0-9]+)$/.test(item.attr('id'))) {
                return item.attr('id').match(/([0-9]+)$/)[1];
            }

            return null;
        },

        /**
         * Update item position on server
         *
         * @expose
         * @param {jQuery} item
         *
         * @return {Object} self
         */
        update: function (item) {
            var that = this,
                list = that.holder,
                update_url = list.data('update_positions_url'),
                set = list.nestedSortable('toArray'),
                post_data = {
                    'item': {
                        'id': that.getId(item),
                        'prev_id': that.getId(item.prev()),
                        'next_id': that.getId(item.next()),
                        'parent_id': that.getId(item.parent().parent())
                    }
                };

            if (!that.is('updating') && JSON.stringify(set) !== JSON.stringify(that.set)) {
                that.is({'updating': true, 'updated': false});
                list.nestedSortable('disable');
                refinery.spinner.on();

                $.post(update_url, post_data, null, 'JSON')
                    .done(function (response, status, xhr) {
                        if (status === 'error') {
                            list.html(that.html);
                        } else {
                            that.set = set;
                            that.html = list.html();
                        }

                        refinery.xhr.success(
                            response,
                            list,
                            xhr.getResponseHeader('X-XHR-Redirected-To'));
                        that.is('updated', true);
                        that.trigger('update');
                    })
                    .fail(function (response) {
                        list.html(that.html);
                        refinery.xhr.error(response);
                    })
                    .always(function () {
                        refinery.spinner.off();
                        that.is('updating', false);
                        list.nestedSortable('enable');
                    });
            }

            return that;
        },

        destroy: function () {
            this.holder.nestedSortable('destroy');
            this.set = null;

            return this._destroy();
        },

        init: function (holder) {
            if (this.is('initialisable')) {
                this.is('initialising', true);

                holder.nestedSortable(this.options.nested_sortable);
                this.holder = holder;
                this.set = holder.nestedSortable('toArray');
                this.html = holder.html();
                this.is({'initialised': true, 'initialising': false});
                this.trigger('init');
            }

            return this;
        }
    });


    /**
     * Sortable list initialization
     *
     * @expose
     * @param  {jQuery} holder
     * @param  {refinery.UserInterface} ui
     * @return {undefined}
     */
    refinery.admin.ui.sortableList = function (holder, ui) {
        holder.find('.sortable-list').each(function () {
            ui.addObject(
                refinery('admin.SortableList').init($(this))
            );
        });
    };

}(refinery));

// Source: scripts/admin/sortable_tree.js
(function (refinery) {

    /**
     * Sortable Tree
     *
     * @constructor
     * @expose
     * @extends {refinery.admin.SortableList}
     * @param {Object=} options
     * @param {boolean=} is_prototype
     */
    refinery.Object.create({

        /**
         * Configurable options
         *
         * @param {{nested_sortable: Object}} options
         */
        objectConstructor: function (options, is_prototype) {
            var that = this;

            refinery.Object.apply(that, arguments);

            if (!is_prototype) {

                /**
                 *
                 * @expose
                 * @param {*} event
                 * @param {*} ui
                 *
                 * @return {undefined}
                 */
                that.options.nested_sortable.stop = function (event, ui) {
                    that.update(ui.item);
                };
            }
        },

        objectPrototype: refinery('admin.SortableList', {

            /**
             * @expose
             * @type {{items: string, listType: string, maxLevels: number}}
             */
            nested_sortable: {
                'listType': 'ul',
                'handle': '.move',
                'items': 'li',
                'isAllowed': function (placeholder, placeholderParent, currentItem) {
                    if (placeholderParent) {
                        if (placeholderParent.text() === currentItem.parent().text()) {
                            return false;
                        }
                    }

                    return true;
                },
                'maxLevels': 0
            }
        }, true),

        name: 'SortableTree'
    });

    /**
     * Sortable tree initialization
     *
     * @expose
     * @param  {jQuery} holder
     * @param  {refinery.UserInterface} ui
     * @return {undefined}
     */
    refinery.admin.ui.sortableTree = function (holder, ui) {
        holder.find('.sortable-tree').each(function () {
            ui.addObject(
                refinery('admin.SortableTree').init($(this))
            );
        });
    };

}(refinery));

// Source: scripts/admin/user_interface.js
(function (refinery) {

    /**
     * @constructor
     * @extends {refinery.UserInterface}
     * @param {Object=} options
     * @return {refinery.admin.UserInterface}
     */
    refinery.Object.create({
        objectPrototype: refinery('UserInterface', {
            'ui_modules': refinery.admin.ui
        }, true),

        module: 'admin',

        name: 'UserInterface'
    });

}(refinery));

// Source: scripts/admin/dialogs/dialog.js
(function (refinery) {

   /**
     * refinery Object State
     *
     * @constructor
     * @extends {refinery.ObjectState}
     * @param {Object=} default_states
     *    Usage:
     *        new refinery.ObjectState();
     *
     * @todo  measure perf and if needed refactor to use bit masks, fsm or something else
     */
    function DialogState (default_states) {
        var states = $.extend(default_states || {}, {
            'closed' : true
        });

        refinery.ObjectState.call(this, states);
    }

    /**
     * Custom State Object prototype
     * @expose
     * @type {Object}
     */
    DialogState.prototype = {
        '_openable': function () {
            return (this.get('initialised') && this.get('closed') && !this.get('opening'));
        },
        '_closable': function () {
            return (!this.get('closing') && this.get('opened'));
        },
        '_loadable': function () {
            return (!this.get('loading') && !this.get('loaded'));
        },
        '_insertable': function () {
            return (this.get('initialised') && !this.get('inserting'));
        }
    };

    refinery.extend(DialogState.prototype, refinery.ObjectState.prototype);


    /**
     * @constructor
     * @extends {refinery.Object}
     * @param {{title: string, url_path: string}=} options
     * @return {refinery.admin.Dialog}
     */
    refinery.Object.create(
        /**
         * @extends {refinery.Object.prototype}
         */
        {
            name: 'Dialog',

            module: 'admin',

            options: {
                'title': '',

                /**
                 * Url which from will be loaded dialog content via xhr or iframe
                 * @expose
                 * @type {?string}
                 */
                'url_path': null,
                'width': 710,
                'modal': true,
                'autoOpen': false,
                'autoResize': true
            },

            State: DialogState,

            /**
             *
             * @expose
             *
             * @return {Object} self
             */
            close: function () {
                if (this.is('closable')) {
                    this.holder.dialog('close');
                }

                return this;
            },

            /**
             *
             * @expose
             *
             * @return {Object} self
             */
            open: function () {
                if (this.is('openable')) {
                    this.is('opening', true);
                    this.holder.dialog('open');
                }

                return this;
            },

            /**
             * Handle Insert event
             * For specific use should be implemented in subclasses
             *
             * @expose
             * @param {!jQuery} elm Element which evoke insert event
             *
             * @return {Object} self
             */
            insert: function (elm) {
                var tab = elm.closest('.ui-tabs-panel'),
                    obj, fnc;

                if (tab.length > 0) {
                    fnc = tab.attr('id').replace(/-/g, '_');
                    if (typeof this[fnc] === 'function') {
                        obj = this[fnc](elm);
                    } else if (elm.hasClass('ui-selected')) {
                        obj = this.selectable_area(elm);
                    }
                }

                if (obj) {
                    this.trigger('insert', obj);
                }

                return this;
            },

            /**
             * Bind events to dialog buttons and forms
             *
             * @expose
             * @return {undefined}
             */
            init_buttons: function () {
                var that = this,
                    holder = that.holder;

                holder.on('click', '.cancel-button, .close-button', function (e) {
                    e.preventDefault();
                    that.close();
                    return false;
                });

                holder.on('submit', 'form', function (e) {
                    var form = $(this);

                    if (!form.attr('action')) {
                        e.preventDefault();
                        e.stopPropagation();
                        that.insert(form);
                    }
                });
            },

            /**
             * Load dialog content
             *
             * @expose
             * @todo this is (still) ugly, refactor!
             *
             * @return {Object} self
             */
            load: function () {
                var that = this,
                    holder = that.holder,
                    url = refinery.admin.backend_path() + that.options.url_path,
                    locale_input = $('#frontend_locale'),
                    params, xhr;

                if (that.is('loadable')) {
                    that.is('loading', true);

                    params = {
                        'id': that.id,
                        'frontend_locale': locale_input.length > 0 ? locale_input.val() : 'en'
                    };

                    xhr = $.ajax(url, params);

                    xhr.fail(function () {
                        // todo xhr, status
                        holder.html($('<div/>', {
                            'class': 'flash error',
                            'html': t('refinery.admin.dialog_content_load_fail')
                        }));
                    });

                    xhr.done(function (response) {
                        var ui_holder = $('<div/>');

                        holder.empty();
                        ui_holder.appendTo(holder);
                        refinery.xhr.success(response, ui_holder);
                        that.ui_init(ui_holder);
                        that.is('loaded', true);
                    });

                    xhr.always(function () {
                        that.is('loading', false);
                        holder.removeClass('loading');
                        that.trigger('load');
                    });
                }

                return this;
            },

            ui_init: function (ui_holder) {
                var that = this,
                    ui;

                (function ui_change () {
                    ui = refinery('admin.UserInterface', {
                        'main_content_selector': '.dialog-content-wrapper'
                    }).init(ui_holder);

                    ui.subscribe('ui:change', function () {
                        ui.destroy();
                        ui_change();
                    });

                    that.on('destroy', function () {
                        ui.destroy();
                    });
                }());
            },

            bind_events: function () {
                var that = this,
                    holder = that.holder;

                that.on('insert', that.close);
                that.on('open', that.load);

                holder.on('dialogopen', function () {
                    that.is({ 'opening': false, 'opened': true, 'closed': false });
                    that.trigger('open');
                });

                holder.on('dialogbeforeclose', function () {
                    // this is here because dialog can be closed via ESC or X button
                    // and in that case is not running through that.close
                    // @todo maybe purge own close - open methods
                    that.is({ 'closing': false, 'closed': true, 'opened': false });
                    that.trigger('close');
                });

                holder.on('selectableselected', '.records.ui-selectable', function (event, ui) {
                    that.insert($(ui.selected));
                });

                holder.on('click', '.pagination a', function (event) {
                    var a = $(this),
                        url = /** @type {string} */(a.attr('href'));

                    event.preventDefault();
                    event.stopPropagation();

                    $.get(url).done(
                        /**
                         * @param {json_response} response
                         * @param {string} status
                         * @param {jQuery.jqXHR} xhr
                         * @return {undefined}
                         */
                        function (response, status, xhr) {
                            holder.find('.dialog-content-wrapper')
                            .trigger('ajax:success', [response, status, xhr]);
                        }).always(function () {
                            refinery.spinner.off();
                        });
                });

                holder.on('ajax:success',
                    /**
                     *
                     * @param  {jQuery.jqXHR} xhr
                     * @param  {json_response} response
                     * @return {undefined}
                     */
                    function (xhr, response) {
                        that.upload_area(response);
                    });
            },

            /**
             * Handle uploaded resource
             *
             * abstract
             * @expose
             * @return {undefined}
             */
            upload_area: function () { },

            /**
             * Handle default behavior on selecting element on dialog
             *
             * @param {!jQuery} element
             * @return {!Object}
             */
            selectable_area: function (element) {
                element.removeClass('ui-selected');

                return /** @type {!Object} */(element.data('dialog'));
            },


            /**
             *
             * @expose
             * @return {Object} self
             */
            destroy: function () {
                if (this.is('initialised')) {
                    this.holder.dialog('destroy');
                }

                return this._destroy();
            },

            /**
             * Initialization and binding
             *
             * @public
             * @expose
             *
             * @return {refinery.Object} self
             */
            init: function () {
                var holder;

                if (this.is('initialisable')) {
                    this.is('initialising', true);
                    holder = $('<div/>', {
                        'id': 'dialog-' + this.id,
                        'class': 'loading'
                    });

                    holder.dialog(this.options);

                    this.holder = holder;

                    this.bind_events();
                    this.init_buttons();

                    this.is({'initialised': true, 'initialising': false});
                    this.trigger('init');
                }

                return this;
            }
        });

}(refinery));

// Source: scripts/admin/pickers/picker.js
(function (refinery) {

    /**
     * @constructor
     * @extends {refinery.Object}
     * @param {Object=} options
     */
    refinery.Object.create({
        name: 'Picker',

        module: 'admin',

        /**
         * @expose
         * @type {?string}
         */
        elm_current_record_id: null,

        /**
         * @expose
         * @type {jQuery}
         */
        elm_record_holder: null,

        /**
         * @expose
         * @type {jQuery}
         */
        elm_no_picked_record: null,

        /**
         * @expose
         * @type {jQuery}
         */
        elm_remove_picked_record: null,

        /**
         * refinery admin dialog
         *
         * @expose
         *
         * @type {?refinery.admin.Dialog}
         */
        dialog: null,

        /**
         * Open dialog
         *
         * @expose
         *
         * @return {Object} self
         */
        open: function () {
            this.dialog.init().open();

            return this;
        },

        /**
         * Close dialog
         *
         * @expose
         *
         * @return {Object} self
         */
        close: function () {
            this.dialog.close();

            return this;
        },

        /**
         * Insert record to form
         *
         * @param {{id: (string|number)}} record
         * @expose
         *
         * @return {Object} self
         */
        insert: function (record) {
            return record;
        },

        /**
         *
         * @expose
         * @return {Object} self
         */
        destroy: function () {
            this.dialog.destroy();

            return this._destroy();
        },

        /**
         * Bind events
         *
         * @protected
         * @expose
         *
         * @return {undefined}
         */
        bind_events: function () {
            var that = this,
                holder = that.holder;

            holder.find('.current-record-link').on('click', function (e) {
                e.preventDefault();
                that.open();
            });

            holder.find('.remove-picked-record').on('click', function (e) {
                e.preventDefault();
                that.elm_current_record_id.val('');
                that.elm_record_holder.empty();
                that.elm_remove_picked_record.addClass('hide');
                that.elm_no_picked_record.removeClass('hide');
                that.trigger('remove');
            });
        },

        /**
         * Abstract method
         *
         * @expose
         */
        bind_dialog: function (dialog) {
            return dialog;
        },

        /**
         * Initialization and binding
         *
         * @param {!jQuery} holder
         * @param {Object} dialog
         *
         * @return {refinery.Object} self
         */
        init: function (holder, dialog) {
            if (this.is('initialisable')) {
                this.is('initialising', true);
                this.holder = holder;
                this.dialog = this.bind_dialog(dialog);

                this.elm_current_record_id = holder.find('.current-record-id');
                this.elm_record_holder = holder.find('.record-holder');
                this.elm_no_picked_record = holder.find('.no-picked-record-selected');
                this.elm_remove_picked_record = holder.find('.remove-picked-record');
                this.bind_events();
                this.is({ 'initialised': true, 'initialising': false });
                this.trigger('init');
            }

            return this;
        }
    });

}(refinery));

// Source: scripts/admin/dialogs/image_dialog.js
(function (refinery) {

    /**
     * @constructor
     * @extends {refinery.admin.Dialog}
     * @param {Object=} options
     */
    refinery.Object.create({

        /**
         * @param {image_dialog_options} options
         */
        objectConstructor: function (options) {
            options.url_path = '/dialogs/image/' + options.image_id;

            refinery.Object.apply(this, arguments);
        },

        objectPrototype: refinery('admin.Dialog', {
            title: t('refinery.admin.image_dialog_title')
        }, true),

        name: 'ImageDialog',

        /**
         * Propagate selected image wth attributes to dialog observers
         *
         * @param {!jQuery} form
         * @return {Object} self
         */
        insert: function (form) {
            var size_elm = form.find('#image-size .ui-selected a');

            return this.trigger('insert', {
                'id': form.find('#image-id').val(),
                'alt': form.find('#image-alt').val(),
                'size': size_elm.data('size'),
                'geometry': size_elm.data('geometry'),
                'sizes': form.find('#image-preview').data()
            });
        }
    });

}(refinery));

// Source: scripts/admin/dialogs/images_dialog.js
(function (refinery) {

    /**
     * @constructor
     * @extends {refinery.admin.Dialog}
     * @param {Object=} options
     */
    refinery.Object.create({
        objectPrototype: refinery('admin.Dialog', {
            title: t('refinery.admin.images_dialog_title'),
            url_path: '/dialogs/images'
        }, true),

        name: 'ImagesDialog',

        /**
         * Handle image linked by url
         *
         * @expose
         * @param {!jQuery} form
         * @return {undefined|images_dialog_object}
         */
        external_image_area: function (form) {
            var url_input = form.find('input[type="url"]:valid'),
                alt_input = form.find('input[type="text"]:valid'),
                url = /** @type {string} */(url_input.val()),
                alt = /** @type {string} */(alt_input.val());

            if (url) {
                url_input.val('');
                alt_input.val('');

                return {
                    url: url,
                    alt: alt
                };
            }
        },

        /**
         * Handle uploaded image
         *
         * @expose
         * @param {json_response} json_response
         * @return {undefined}
         */
        upload_area: function (json_response) {
            if (json_response.image) {
                this.trigger('insert', json_response.image);
                this.holder.find('li.ui-selected').removeClass('ui-selected');
                this.holder.find('.ui-tabs').tabs({ 'active': 0 });
            }
        }
    });

}(refinery));

// Source: scripts/admin/dialogs/links_dialog.js
(function (refinery) {

    /**
     * @constructor
     * @extends {refinery.admin.Dialog}
     * @param {Object=} options
     */
    refinery.Object.create({
        objectPrototype: refinery('admin.Dialog', {
            title: t('refinery.admin.links_dialog_title'),
            url_path: '/dialogs/links'
        }, true),

        name: 'LinksDialog',

        /**
         * Dialog email tab action processing
         *
         * @param {!jQuery} form
         * @expose
         *
         * @return {undefined|links_dialog_object}
         */
        email_link_area: function (form) {
            var email_input = form.find('#email_address_text:valid'),
                subject_input = form.find('#email_default_subject_text'),
                body_input = form.find('#email_default_body_text'),
                recipient = /** @type {string} */(email_input.val()),
                subject = /** @type {string} */(subject_input.val()),
                body = /** @type {string} */(body_input.val()),
                url = '';

            if (recipient) {
                url = 'mailto:' + encodeURIComponent(recipient) +
                        '?subject=' + encodeURIComponent(subject) +
                        '&body=' + encodeURIComponent(body);

                email_input.val('');
                subject_input.val('');
                body_input.val('');

                return {
                    type: 'email',
                    title: recipient,
                    url: url
                };
            }
        },

        /**
         * Dialog Url tab action processing
         *
         * @param {!jQuery} form
         * @expose
         *
         * @return {undefined|links_dialog_object}
         */
        website_link_area: function (form) {
            var url_input = form.find('#web_address_text:valid'),
                blank_input = form.find('#web_address_target_blank'),
                url = /** @type {string} */(url_input.val()),
                blank = /** @type {boolean} */(blank_input.prop('checked'));

            if (url) {
                url_input.val('http://');
                blank_input.prop('checked', false);

                return {
                    type: 'website',
                    title: url.replace(/^https?:\/\//, ''),
                    url: url,
                    blank: blank
                };
            }
        }
    });

}(refinery));

// Source: scripts/admin/dialogs/resources_dialog.js
(function (refinery) {

    /**
     * @constructor
     * @extends {refinery.admin.Dialog}
     * @param {Object=} options
     */
    refinery.Object.create({
        objectPrototype: refinery('admin.Dialog', {
            title: t('refinery.admin.resources_dialog_title'),
            url_path: '/dialogs/resources'
        }, true),

        name: 'ResourcesDialog',

        /**
         * Handle uploaded file
         *
         * @param {json_response} json_response
         * @return {undefined}
         */
        upload_area: function (json_response) {
            if (json_response.file) {
                this.trigger('insert', json_response.file);

                this.holder.find('li.ui-selected').removeClass('ui-selected');
                this.holder.find('.ui-tabs').tabs({ 'active': 0 });
            }
        }
    });

}(refinery));

// Source: scripts/admin/pickers/image_picker.js
(function (refinery) {

    /**
     * @constructor
     * @extends {refinery.admin.Picker}
     * @param {Object=} options
     */
    refinery.Object.create({
        objectPrototype: refinery('admin.Picker', null, true),

        name: 'ImagePicker',

        /**
         * Initialize Images Dialog
         */
        bind_dialog: function (dialog) {
            var that = this;

            /**
             * refinery.admin.ImagesDialog
             */
            dialog.on('load', function () {
                    /**
                     * Hide url tab as we can insert in picker only images from our library.
                     * When it will be implemented functionality upload external image to server
                     * then this can disappear
                     *
                     */
                    dialog.holder.find('li[aria-controls="external-image-area"]').hide();
                })
                .on('insert', function (record) {
                    that.insert(record);
                    dialog.close();
                });

            return dialog;
        },

        /**
         * Attach image to form
         *
         * @param {images_dialog_object} img
         *
         * @return {Object} self
         */
        insert: function (img) {
            this.elm_current_record_id.val(img.id);

            this.elm_record_holder.html($('<img/>', {
                'class': 'record size-medium',
                'src': img.thumbnail
            }));

            this.elm_no_picked_record.addClass('hide');
            this.elm_remove_picked_record.removeClass('hide');
            this.trigger('insert');

            return this;
        }
    });

    /**
     *
     * @expose
     * @param  {jQuery} holder
     * @param  {refinery.UserInterface} ui
     * @return {undefined}
     */
    refinery.admin.ui.imagePicker = function (holder, ui) {
        holder.find('.image-picker').each(function () {
            ui.addObject(
                refinery('admin.ImagePicker').init(
                    $(this),
                    refinery('admin.ImagesDialog')
                )
            );
        });
    };

}(refinery));

// Source: scripts/admin/pickers/resource_picker.js
(function (refinery) {

    /**
     * @constructor
     * @extends {refinery.admin.Picker}
     * @param {Object=} options
     */
    refinery.Object.create({
        objectPrototype: refinery('admin.Picker', null, true),

        name: 'ResourcePicker',

        /**
         * Initialize Resources Dialog
         */
        bind_dialog: function (dialog) {
            var that = this;

            dialog.on('insert', function (record) {
                that.insert(record);
                dialog.close();
            });

            return dialog;
        },

        /**
         * Attach resource - file to form
         *
         * @param {file_dialog_object} file
         *
         * @return {Object} self
         */
        insert: function (file) {
            var html = $('<span/>', {
                'text': file.name + ' - ' + file.size,
                'class': 'title' + ( ' ' + file.ext || '')
            });

            this.elm_current_record_id.val(file.id);

            this.elm_record_holder.html($('<a/>', {
                'src': file.url,
                'html': html,
                'class': 'record'
            }));

            this.elm_no_picked_record.addClass('hide');
            this.elm_remove_picked_record.removeClass('hide');
            this.trigger('insert');

            return this;
        }

    });

    /**
     *
     * @expose
     * @param  {jQuery} holder
     * @param  {refinery.UserInterface} ui
     * @return {undefined}
     */
    refinery.admin.ui.resourcePicker = function (holder, ui) {
        holder.find('.resource-picker').each(function () {
            ui.addObject(
                refinery('admin.ResourcePicker').init(
                    $(this),
                    refinery('admin.ResourcesDialog')
                )
            );
        });
    };

}(refinery));
}(window, jQuery));