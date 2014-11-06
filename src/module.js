(function () {
    "use strict";

    var module = angular.module("nge.input-mask", []);

    module.provider("ngeInputMaskConfig", [
        function () {
            this.placeholder = "_";
            this.charValidation = {
                "A": /[A-Za-z]/,
                "a": /[a-z]/,
                "9": /[0-9]/
            };

            this.$get = function () {
                return {
                    placeholder: this.placeholder,
                    charValidation: this.charValidation
                };
            };

            this.setPlaceholder = function (placeholder) {
                this.placeholder = placeholder;
            };

            this.addCharValidation = function (char, regex) {
                this.charValidation[char] = regex;
            };
        }
    ]);

    module.directive("ngeInputMask", ["ngeInputMaskConfig",
        function (ngeInputMaskConfig) {
            return {
                require: "?ngModel",
                restrict: "A",
                link: function (scope, iElement, iAttrs, controller) {
                    if (!controller) {
                        return;
                    }

                    if (!iAttrs.ngeInputMask) {
                        return;
                    }
                    var mask = iAttrs.ngeInputMask;

                    var buffer = "";
                    var bufferMax = getBufferMax(mask);

                    var cursor;
                    iElement.on("click", function () {
                        cursor = this.selectionStart;
                        if (cursor !== this.selectionEnd) { // Allow copying
                            return;
                        }

                        cursor = unformatCursor(cursor, mask);

                        cursor = cursor < buffer.length ? cursor : buffer.length;
                        updateCursor(formatCursor(cursor, mask));
                    });

                    iElement.on("paste", function () {
                        var oldContent = this.value;
                        var that = this;
                        function waitForPaste() {
                            if (oldContent === that.value) {
                                // Poll for paste content
                                setTimeout(waitForPaste, 10);
                            } else {
                                buffer = cleanBuffer(that.value, bufferMax);
                                updateView(formatBuffer(buffer, mask));
                                updateCursor(formatCursor(cursor, mask));
                            }
                        }
                        waitForPaste();
                    });

                    iElement.on("keydown", function (ev) {
                        cursor = this.selectionStart;
                        cursor = unformatCursor(cursor, mask);

                        // Delete from buffer selected on delete or backspace.
                        if (this.selectionStart !== this.selectionEnd) {
                            if (ev.which !== 8 && ev.which !== 46) {
                                return;
                            }
                            var cursorEnd = this.selectionEnd;
                            cursorEnd = unformatCursor(cursorEnd, mask);
                            var delta = cursorEnd - cursor;
                            buffer = buffer.splice(cursor, delta);
                            updateView(formatBuffer(buffer, mask));
                        } else {
                            switch (ev.which) {
                                case 8: // Pressed delete key
                                    cursor -= 1;
                                case 46: // Pressed backspace key
                                    buffer = buffer.splice(cursor, 1);
                                    updateView(formatBuffer(buffer, mask));
                                    break;
                                case 37: // left arrow key.
                                    cursor -= 1;
                                    break;
                                case 38: // up arrow key.
                                    cursor = 0;
                                    break;
                                case 39: // right arrow key.
                                    cursor += 1;
                                    break;
                                case 40: // down arrow key.
                                    cursor = buffer.length;
                                    break;
                                default:
                                    return;
                            }
                        }
                        ev.preventDefault();

                        cursor = cursor < buffer.length ? cursor : buffer.length;
                        updateCursor(formatCursor(cursor, mask));
                    });

                    iElement.on("keypress", function (ev) {
                        if (ev.which === 0 || ev.altKey || ev.ctrlKey) { // tab key or modifiers
                            return;
                        }
                        var char = String.fromCharCode(ev.which);
                        var oldBuffer = buffer;
                        buffer = buffer.splice(cursor, 0, char);
                        buffer = cleanBuffer(buffer, bufferMax);
                        cursor += buffer.length - oldBuffer.length;

                        ev.preventDefault();

                        updateView(formatBuffer(buffer, mask));
                        updateCursor(formatCursor(cursor, mask));
                    });

                    iElement.on("blur", function () {
                        if (buffer === "") {
                            updateView("");
                        }
                    });

                    // Number of chars to allow in buffer.
                    function getBufferMax(mask) {
                        var bufferLen = 0;
                        for (var i = 0; i < mask.length; i++) {
                            if (mask[i] in ngeInputMaskConfig.charValidation) {
                                bufferLen += 1;
                            }
                        }
                        return bufferLen;
                    }

                    function formatBuffer(buffer, mask) {
                        var buffer_masked = "";
                        for (var i = 0, j = 0; i < mask.length; i++) {
                            if (mask[i] in ngeInputMaskConfig.charValidation && j < buffer.length) {
                                buffer_masked += buffer[j];
                                j += 1;
                            } else if (mask[i] in ngeInputMaskConfig.charValidation) {
                                buffer_masked += ngeInputMaskConfig.placeholder;
                            } else {
                                buffer_masked += mask[i];
                            }
                        }
                        return buffer_masked;
                    }

                    function cleanBuffer(buffer, bufferMax) {
                        var cleanedBuffer = "";
                        for (var i = 0; i < buffer.length; i++) {
                            var cursorFmt = formatCursor(cleanedBuffer.length, mask);
                            var charRegex = ngeInputMaskConfig.charValidation[mask[cursorFmt]];
                            if (charRegex instanceof RegExp && charRegex.test(buffer[i])) {
                                cleanedBuffer += buffer[i];
                            }
                            if (cleanedBuffer.length === bufferMax) {
                                break;
                            }
                        }
                        return cleanedBuffer;
                    }

                    function formatCursor(cursor, mask) {
                        for (var i = 0, j = 0; i < mask.length; i++) {
                            if (mask[i] in ngeInputMaskConfig.charValidation) {
                                j += 1;
                            }
                            if (j > cursor) {
                                break;
                            }
                        }
                        return i;
                    }

                    function unformatCursor(cursorFmt, mask) {
                        for (var i = 0, j = 0; i < cursorFmt; i++) {
                            if (mask[i] in ngeInputMaskConfig.charValidation) {
                                j += 1;
                            }
                        }
                        return j;
                    }

                    function updateView(bufferFmt) {
                        scope.$apply(function () {
                            controller.$setViewValue(bufferFmt, "nge-input-mask");
                            controller.$render();
                        });
                    }

                    function updateCursor(cursorFmt) {
                        iElement[0].selectionStart = cursorFmt;
                        iElement[0].selectionEnd = cursorFmt;
                    }

                    controller.$parsers.unshift(function (value) {
                        buffer = cleanBuffer(value, bufferMax); 
                        return buffer;
                    });
                }
            };
        }
    ]);
}());
