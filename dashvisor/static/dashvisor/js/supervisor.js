(function ($) {
    $.urlParam = function (name, _default) {
        var results = new RegExp('[\\?&]' + name + '=([^&#]*)').exec(window.location.href);
        return (results && results[1]) || _default || 0;
    };

    var Supervisor = function ($ele, config) {
        this.$ele = $ele;
        this.config = config;
        $.extend(this.config, {screen_update: 3000})
    };

    Supervisor.prototype.do_action = function ($ele) {
        var self = this;
        var server_alias = $ele.data("server");
        var action = $ele.data("action");
        var process = $ele.data('process');
        $.ajax({
            url: this.config.url + encodeURIComponent (server_alias) + "/" + encodeURIComponent(process) + "/" + encodeURIComponent(action) + "/",
            cache: false,
            data: self.config.data || {},
            beforeSend: function (xhr) {
                self.before_action($ele, xhr, action)
            }
        }).done(function (data) {
            self.after_action($ele, data, action);
        }).fail(function (xhr) {
            self.after_action($ele, {}, action);
        })
    };

    Supervisor.prototype.action = function () {
        var self = this;
        self.$ele.each(function () {
            var $ele = $(this);
            $ele.data("autoUpdate", false);
            $ele.click($.proxy(self.do_action, self, $ele));
        });
        return this;
    };

    Supervisor.isRunningState = function(state) {
        return ['starting', 'running'].indexOf(state.toLowerCase()) !== -1;
    };

    Supervisor.isStoppedState = function(state) {
        return ['stopped', 'starting'].indexOf(state.toLowerCase()) !== -1;
    };

    Supervisor.prototype.before_command = function ($ele, xhr, action) {
        $ele.prop("disabled", true);
        if (['start_all', 'stop_all', 'restart_all'].indexOf(action) !== -1) {
            $("button.control-all").prop("disabled", true);
            $ele.find("span.spinner-grow").removeClass('d-none');

        } else if (['supervisor_update', 'supervisor_restart'].indexOf(action) !== -1) {
            var $parents = $ele.parents();
            $parents.find("span.spinner-border").removeClass('d-none');
            $parents.find("img").addClass("d-none")
        }
    };

    Supervisor.prototype.after_command = function ($ele, data, action) {
        if (['start_all', 'stop_all', 'restart_all'].indexOf(action) !== -1) {
            setTimeout(function () {
                $ele.find("span.spinner-grow").addClass('d-none');
                $("button.control-all").prop("disabled", false);
            }, parseInt($.urlParam('autorefresh', 5)) * 1000)
        } else if (action === 'supervisor_restart') {
            $parents = $ele.parents();
            $parents.find("span.spinner-border").addClass('d-none');
            $parents.find("img").removeClass("d-none");
        } else if (action === 'supervisor_update') {
            var $parents = $ele.parents();
            $parents.find("span.spinner-border").addClass('d-none');
            $parents.find("img").removeClass("d-none");
            var $toast = this.config.screen.toast("show");
            $toast.find("strong.title").text("Supervisor (update)");
            var $toast_body = $toast.find(".toast-body");
            var result = data.result;
            if (result) {
                var status = result[0];
                if (status.added.length === 0 &&
                    status.changed.length === 0 &&
                    status.removed.length === 0) {
                    $toast_body.html("no config changes");
                } else {
                    $toast_body.html(this.config.template.render(status));
                }
            } else {
                $toast_body.html("server error!");
            }
        }
    };

    Supervisor.prototype.before_tail = function ($ele, xhr) {
        var self = this;
        if (!$ele.data("updateTimeHandler")) {
            var $modal_body = this.config.screen.find(".modal-body");
            $modal_body.find(".loading").removeClass("d-none");
            $modal_body.find(".content").empty();
            this.config.screen.find('.modal-title')
                .text("Tail " + $ele.text() + " stdout");
            this.config.screen.modal("show");
            this.config.screen.on('hide.bs.modal', function () {
                $ele.data("autoUpdate", false);
                clearTimeout($ele.data("updateTimeHandler"));
                $ele.removeData("updateTimeHandler");
                self.config.data.offset = 256;
            });
            $ele.data("autoUpdate", true);
        }
    };

    Supervisor.prototype.after_tail = function ($ele, data) {
        var $modal_body = this.config.screen.find(".modal-body");
        var result = data.result;
        if (result) {
            if (result.content.length > 0) {
                $modal_body.find(".loading").addClass("d-none");
                $modal_body.find(".content").append(result.content);
                this.config.data.offset = result.size;
            }
        }
        if ($ele.data("autoUpdate") === true) {
            $ele.data("updateTimeHandler", setTimeout(
                $.proxy(this.do_action, this),
                this.config.screen_update, $ele)
            );
        }
    };

    Supervisor.prototype.before_action = function ($ele, xhr, action) {
        if (action === 'tail') {
            this.before_tail($ele, xhr);
        } else {
            this.before_command($ele, xhr, action);
        }
    };

    Supervisor.prototype.after_action = function ($ele, data, action) {
        if (action === 'tail') {
            this.after_tail($ele, data);
        } else {
            this.after_command($ele, data, action);
        }
    };

    $.fn.Supervisor = Supervisor;
    $.fn.supervisor = function (config) {
        return new Supervisor($(this), config || {})
    };

}(jQuery));