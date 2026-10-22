var DATE_FORMAT = "yyyy-mm-dd";      
var DISCOUNT_LIMIT_DAYS = 7;         
var DISCOUNT_RATE = 0.10;            
var MS_PER_DAY = 24 * 60 * 60 * 1000;

function formatMoney(n) {
    return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function parseDate(text) {
    var m, y, mo, d;
    if (DATE_FORMAT === "dd-mm-yyyy") {
        m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(text);
        if (m === null) { return null; }
        d = parseInt(m[1], 10); mo = parseInt(m[2], 10); y = parseInt(m[3], 10);
    } else {
        m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
        if (m === null) { return null; }
        y = parseInt(m[1], 10); mo = parseInt(m[2], 10); d = parseInt(m[3], 10);
    }
    var date = new Date(Date.UTC(y, mo - 1, d));
    if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) {
        return null;
    }
    return date;
}

function daysBetween(start, end) {
    return Math.round((end.getTime() - start.getTime()) / MS_PER_DAY);
}

function getSelectedCars() {
    var cars = [];
    $("input.chk-select:checked").each(function () {
        var row = $(this).closest("tr");
        cars.push({
            code: $.trim(row.find(".c-code").text()),
            model: $.trim(row.find(".c-model").text()),
            price: parseInt(row.find(".c-price").text().replace(/\D/g, ""), 10)
        });
    });
    return cars;
}

function validateName(v) {
    if (v === "") { return ""; }
    if (!/^[\u0621-\u064A]+(\s[\u0621-\u064A]+)*$/.test(v)) {
        return "الاسم يجب أن يحتوي أحرفاً عربية فقط (دون أرقام أو رموز أو أحرف لاتينية).";
    }
    return "";
}

function validateNationalId(v) {
    if (v === "") { return "الرقم الوطني إلزامي."; }
    if (!/^\d{11}$/.test(v)) { return "الرقم الوطني يتألف من 11 رقماً بالضبط."; }
    var province = parseInt(v.substring(0, 2), 10);
    if (province < 1 || province > 14) {
        return "أول خانتين تمثلان المحافظة ويجب أن تكونا بين 01 و 14.";
    }
    return "";
}

function validateDateField(v, label) {
    if (v === "") { return label + " إلزامي."; }
    if (parseDate(v) === null) {
        return "صيغة التاريخ غير صحيحة، المطلوب: " + DATE_FORMAT + " وتاريخ حقيقي.";
    }
    return "";
}

function validateMobile(v) {
    if (v === "") { return ""; }
    var n = v.replace(/[\s-]/g, "");
    if (!/^(?:\+963|00963|0)?9[345689]\d{7}$/.test(n)) {
        return "رقم غير مطابق لشبكتي Syriatel (093/098/099) أو MTN (094/095/096).";
    }
    return "";
}

function validateEmail(v) {
    if (v === "") { return ""; }
    if (!/^[A-Za-z0-9._%+\-]+@[A-Za-z0-9\-]+(\.[A-Za-z0-9\-]+)*\.[A-Za-z]{2,}$/.test(v)) {
        return "صيغة البريد الإلكتروني غير صحيحة (مثال: name@example.com).";
    }
    return "";
}

function showFieldError(id, msg) {
    $("#err-" + id).text(msg);
    if (msg === "") { $("#" + id).removeClass("invalid"); }
    else { $("#" + id).addClass("invalid"); }
}

function clearAllErrors() {
    $("#booking-form .error").text("");
    $("#booking-form input[type='text']").removeClass("invalid");
}

function checkField(id) {
    var v = $.trim($("#" + id).val());
    var msg = "";
    if (id === "fullname") { msg = validateName(v); }
    else if (id === "nationalid") { msg = validateNationalId(v); }
    else if (id === "startdate") { msg = validateDateField(v, "تاريخ بداية التأجير"); }
    else if (id === "enddate") { msg = validateDateField(v, "تاريخ نهاية التأجير"); }
    else if (id === "mobile") { msg = validateMobile(v); }
    else if (id === "email") { msg = validateEmail(v); }
    showFieldError(id, msg);
    return msg === "";
}

function checkDateOrder() {
    var s = parseDate($.trim($("#startdate").val()));
    var e = parseDate($.trim($("#enddate").val()));
    if (s !== null && e !== null && daysBetween(s, e) < 1) {
        showFieldError("enddate", "تاريخ النهاية يجب أن يكون لاحقاً لتاريخ البداية.");
        return false;
    }
    return true;
}

function validateForm() {
    var ok = true;
    var ids = ["fullname", "nationalid", "startdate", "enddate", "mobile", "email"];
    for (var i = 0; i < ids.length; i++) {
        if (!checkField(ids[i])) { ok = false; }
    }
    if (ok && !checkDateOrder()) { ok = false; }
    if (getSelectedCars().length === 0) {
        $("#select-msg").text("لا توجد سيارة مختارة. اختر سيارة واحدة على الأقل من الجدول.").show();
        ok = false;
    }
    return ok;
}


function showResult() {
    var cars = getSelectedCars();
    var start = parseDate($.trim($("#startdate").val()));
    var end = parseDate($.trim($("#enddate").val()));
    var days = daysBetween(start, end);
    var name = $.trim($("#fullname").val());

    var rows = "";
    var total = 0;
    for (var i = 0; i < cars.length; i++) {
        var sub = cars[i].price * days;
        total += sub;
        rows += "<tr><td>" + cars[i].code + "</td><td>" + cars[i].model + "</td><td>" +
                formatMoney(cars[i].price) + "</td><td>" + days + "</td><td>" +
                formatMoney(sub) + "</td></tr>";
    }

    var discount = 0;
    var discountText = "لا ينطبق (المدة " + DISCOUNT_LIMIT_DAYS + " أيام أو أقل)";
    if (days > DISCOUNT_LIMIT_DAYS) {
        discount = total * DISCOUNT_RATE;
        discountText = formatMoney(discount) + " ل.س (" + (DISCOUNT_RATE * 100) + "%)";
    }
    var finalAmount = total - discount;

    var html = "<h2>ملخص طلب الحجز</h2>";
    if (name !== "") { html += "<p>مقدم الطلب: <strong>" + name + "</strong></p>"; }
    html += "<p>مدة التأجير: من " + $.trim($("#startdate").val()) + " إلى " +
            $.trim($("#enddate").val()) + " (<strong>" + days + "</strong> يوماً)</p>";
    html += "<table><tr><th>الرمز</th><th>الموديل</th><th>السعر اليومي</th><th>عدد الأيام</th><th>الإجمالي (ل.س)</th></tr>" +
            rows + "</table>";
    html += "<table><tr><td>المجموع قبل الخصم</td><td>" + formatMoney(total) + " ل.س</td></tr>" +
            "<tr><td>الخصم</td><td>" + discountText + "</td></tr>" +
            "<tr class='total-row'><td>المبلغ النهائي</td><td>" + formatMoney(finalAmount) + " ل.س</td></tr></table>";
    html += "<p class='note'>يُطبَّق خصم " + (DISCOUNT_RATE * 100) + "% عندما تتجاوز مدة التأجير " +
            DISCOUNT_LIMIT_DAYS + " أيام.</p>";
    html += "<div class='btn-row'><button type='button' id='btn-close-result'>إغلاق</button></div>";

    $("#result-content").html(html);
    $("#result-overlay").fadeIn(250);
}

$(document).ready(function () {

    $("#exit-link").click(function (e) {
        e.preventDefault();
        if (confirm("هل تريد الخروج من الموقع؟")) {
            window.close();   
            setTimeout(function () { window.location.href = "about:blank"; }, 200);
        }
    });

    $(".stat-num").each(function () {
        var el = $(this);
        var target = parseInt(el.text(), 10);
        el.text("0");
        $({ v: 0 }).animate({ v: target }, {
            duration: 1200,
            step: function (now) { el.text(Math.round(now)); },
            complete: function () { el.text(target); }
        });
    });

    if ($("#cars-table").length === 0) { return; }

    $("input.chk-details").click(function () {
        var detailsRow = $(this).closest("tr").next("tr.details-row");
        var panel = detailsRow.find(".details-panel");
        if (this.checked) {
            panel.hide();
            detailsRow.show();
            panel.slideDown(300);
        } else {
            panel.slideUp(250, function () { detailsRow.hide(); });
        }
    });

    $("input.chk-select").click(function () {
        $(this).closest("tr").toggleClass("selected", this.checked);
        if (getSelectedCars().length > 0) { $("#select-msg").hide(); }
    });

    $("#btn-continue").click(function () {
        var cars = getSelectedCars();
        if (cars.length === 0) {
            $("#select-msg").text("الرجاء اختيار سيارة واحدة على الأقل قبل المتابعة.").fadeIn(200);
            return;
        }
        $("#select-msg").hide();
        var list = "";
        for (var i = 0; i < cars.length; i++) {
            list += "<li>" + cars[i].code + " - " + cars[i].model + " (" + formatMoney(cars[i].price) + " ل.س / يوم)</li>";
        }
        $("#selected-list").html(list);
        $("#booking-section").slideDown(350, function () {
            $("html, body").animate({ scrollTop: $("#booking-section").offset().top - 20 }, 400);
        });
    });

    $("#booking-form input[type='text']").blur(function () {
        checkField(this.id);
        if (this.id === "startdate" || this.id === "enddate") {
            if ($.trim($("#startdate").val()) !== "" && $.trim($("#enddate").val()) !== "" &&
                $("#err-startdate").text() === "" && $("#err-enddate").text() === "") {
                checkDateOrder();
            }
        }
    });

    $("#booking-form").submit(function (e) {
        e.preventDefault();
        if (validateForm()) { showResult(); }
        return false;
    });

    $("#booking-form").bind("reset", function () {
        clearAllErrors();
    });

    $("#result-overlay").on("click", "#btn-close-result", function () {
        $("#result-overlay").fadeOut(200);
    });
});
