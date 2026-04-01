(function () {
    'use strict';

    var form = null;
    var submitButton = null;
    var feedback = null;

    function byId(id) {
        return document.getElementById(id);
    }

    function trimValue(id) {
        var el = byId(id);
        return el ? String(el.value || '').trim() : '';
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function setFieldError(input, message) {
        if (!input) {
            return;
        }
        input.classList.add('is-invalid');
        var errorEl = input.parentNode.querySelector('.field-error');
        if (!errorEl) {
            errorEl = document.createElement('div');
            errorEl.className = 'field-error';
            input.parentNode.appendChild(errorEl);
        }
        errorEl.textContent = message;
    }

    function clearFieldError(input) {
        if (!input) {
            return;
        }
        input.classList.remove('is-invalid');
        var errorEl = input.parentNode.querySelector('.field-error');
        if (errorEl) {
            errorEl.remove();
        }
    }

    function clearAllErrors() {
        if (!form) {
            return;
        }
        var fields = form.querySelectorAll('input, textarea');
        fields.forEach(function (field) {
            clearFieldError(field);
        });
    }

    function renderFeedback(type, message) {
        if (!feedback) {
            return;
        }
        feedback.className = 'contact-feedback ' + (type || '');
        feedback.textContent = message || '';
    }

    function validateForm() {
        clearAllErrors();
        var nameEl = byId('name');
        var emailEl = byId('email');
        var messageEl = byId('message');

        var name = trimValue('name');
        var email = trimValue('email');
        var message = trimValue('message');

        var valid = true;
        if (name.length < 2) {
            setFieldError(nameEl, 'Vui lòng nhập họ tên tối thiểu 2 ký tự.');
            valid = false;
        }
        if (!isValidEmail(email)) {
            setFieldError(emailEl, 'Vui lòng nhập email hợp lệ.');
            valid = false;
        }
        if (message.length < 10) {
            setFieldError(messageEl, 'Nội dung cần ít nhất 10 ký tự.');
            valid = false;
        }

        return valid;
    }

    function setSubmitting(submitting) {
        if (!submitButton) {
            return;
        }
        submitButton.disabled = !!submitting;
        submitButton.textContent = submitting ? 'Đang gửi...' : 'Gửi liên hệ';
    }

    async function submitContact(event) {
        event.preventDefault();
        renderFeedback('', '');

        if (!validateForm()) {
            renderFeedback('error', 'Vui lòng kiểm tra lại thông tin trước khi gửi.');
            return;
        }

        setSubmitting(true);
        try {
            var payload = {
                name: trimValue('name'),
                email: trimValue('email'),
                phone: trimValue('phone'),
                subject: trimValue('subject'),
                message: trimValue('message'),
            };

            var response = await fetch('/api/contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            var result = await response.json().catch(function () {
                return {};
            });

            if (!response.ok) {
                throw new Error(result.error || 'Gửi liên hệ thất bại.');
            }

            form.reset();
            renderFeedback('success', result.message || 'Đã gửi liên hệ thành công.');
        } catch (error) {
            renderFeedback('error', error.message || 'Không thể gửi liên hệ lúc này.');
        } finally {
            setSubmitting(false);
        }
    }

    function bindRealtimeValidation() {
        if (!form) {
            return;
        }
        form.querySelectorAll('input, textarea').forEach(function (field) {
            field.addEventListener('input', function () {
                if (field.classList.contains('is-invalid')) {
                    clearFieldError(field);
                }
            });
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        form = byId('contactForm');
        submitButton = byId('contactSubmitButton');
        feedback = byId('contactFormFeedback');

        if (!form || !submitButton || !feedback) {
            return;
        }

        form.addEventListener('submit', submitContact);
        bindRealtimeValidation();
    });
})();
