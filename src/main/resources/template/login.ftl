[#ftl]
[#import "base.ftl" as base]
[@base.page title="DM Login"]
<div class="container" style="margin-top: 100px">
    <form method="get">
        <label for="provider">Provider</label>
        <select id="provider" name="provider">
            [#list providers as p]
                <option value="${p?html}">${p?html}</option>
            [/#list]
        </select>
        <span class="help-block">Pick a provider to use for logging into DM</span>
        <div class="form-actions">
            <button type="submit" class="btn btn-primary">Login</button>
        </div>
    </form>
</div>
[/@base.page]